// pages/todos.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import ContextMenu from '../components/ContextMenu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

type Todo = {
  id: string;
  content: string;
  is_complete: boolean;
  created_at: string;
  completed_at?: string | null;
  detail?: string | null;
};

const markdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h3 className="text-xl font-semibold text-gray-900 mt-2 mb-1" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h4 className="text-lg font-semibold text-gray-900 mt-2 mb-1" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h5 className="text-base font-semibold text-gray-900 mt-2 mb-1" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="text-gray-700 leading-relaxed mb-2 last:mb-0" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-2 last:mb-0" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal pl-6 text-gray-700 space-y-1 mb-2 last:mb-0" {...props} />
  ),
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-gray-900" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic text-gray-700" {...props} />,
  a: ({ node, ...props }) => (
    <a className="text-blue-600 underline hover:text-blue-700" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2 last:mb-0"
      {...props}
    />
  ),
  code: ({ node, inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm text-gray-800"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code {...props}>{children}</code>
      </pre>
    );
  },
};

// Helper function to format date as "Weekday, Month Day, Year"
const formatDateOnlyString = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Groups todos by completion date
type GroupedTodos = {
  [date: string]: Todo[];
};

const groupTodosByDate = (todos: Todo[]): GroupedTodos => {
  const completedTodos = todos.filter(
    todo => todo.is_complete && todo.completed_at
  );

  // Sort by completed_at descending (most recent first)
  completedTodos.sort(
    (a, b) =>
      new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
  );

  const grouped: GroupedTodos = {};
  completedTodos.forEach(todo => {
    const dateKey = formatDateOnlyString(todo.completed_at!);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(todo);
  });

  return grouped;
};

function TodosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState<string>('');

  /* ---------- UI / state helpers ---------- */
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [detailsMap, setDetailsMap] = useState<Record<string, string>>({});
  const [editingDetailsMap, setEditingDetailsMap] = useState<Record<string, boolean>>({});
  const [recentlyCompleted, setRecentlyCompleted] = useState<string[]>([]);
  const [recentlyReverted, setRecentlyReverted] = useState<string[]>([]);
  const [savingStatusMap, setSavingStatusMap] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

  // Add audio reference
  const completionSoundRef = React.useRef<HTMLAudioElement | null>(null);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString();

  /* ---------- auth + realtime ---------- */
  useEffect(() => {
    let todoChannel: any;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);
      const userId = session.user.id;
      fetchTodos(userId);

      todoChannel = supabase
        .channel('todos_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${userId}`,
          },
          payload => {
            const newTodo = payload.new as Todo;
            setTodos(prev => [newTodo, ...prev]);
            setDetailsMap(prev => ({
              ...prev,
              [newTodo.id]: newTodo.detail ?? '',
            }));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${userId}`,
          },
          payload => {
            const updated = payload.new as Todo;
            setTodos(prev => prev.map(t => (t.id === updated.id ? updated : t)));
            setDetailsMap(prev => ({
              ...prev,
              [updated.id]: updated.detail ?? '',
            }));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${userId}`,
          },
          payload => {
            const deleted = payload.old as Todo;
            setTodos(prev => prev.filter(t => t.id !== deleted.id));
            setDetailsMap(prev => {
              const newMap = { ...prev };
              delete newMap[deleted.id];
              return newMap;
            });
          }
        )
        .subscribe();
    })();

    return () => {
      if (todoChannel) supabase.removeChannel(todoChannel);
    };
  }, [router]);

  /* ---------- DB helpers ---------- */
  const fetchTodos = async (userId: string) => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    if (data) {
      setTodos(data);
      setDetailsMap(
        data.reduce((acc, todo) => {
          acc[todo.id] = todo.detail ?? '';
          return acc;
        }, {} as Record<string, string>)
      );
      setEditingDetailsMap({});
    }
  };

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    setNewTodo('');

    const { data, error } = await supabase
      .from('todos')
      .insert([{ content: text, user_id: user.id }])
      .select('*');

    if (error) {
      console.error('Error adding todo:', error);
      return;
    }

    if (data && data.length) {
      const newItem = data[0];
      setTodos(prev => [newItem, ...prev]);
      setDetailsMap(prev => ({ ...prev, [newItem.id]: newItem.detail ?? '' }));
    }
  };

  const completeTodo = async (id: string) => {
    setRecentlyCompleted(prev => [...prev, id]);

    setTimeout(async () => {
      const completedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('todos')
        .update({ is_complete: true, completed_at: completedAt })
        .eq('id', id)
        .select('*');

      if (error) {
        console.error('Error completing todo:', error);
        setRecentlyCompleted(prev => prev.filter(tid => tid !== id));
        return;
      }

      setTodos(prev =>
        prev.map(t => (t.id === id ? { ...t, is_complete: true, completed_at: completedAt } : t))
      );
      setRecentlyCompleted(prev => prev.filter(tid => tid !== id));
      if (completionSoundRef.current) {
        completionSoundRef.current.play();
      }
    }, 100);
  };

  const revertTodo = async (id: string) => {
    setRecentlyReverted(prev => [...prev, id]);

    setTimeout(async () => {
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: false, completed_at: null })
        .eq('id', id);

      if (error) {
        console.error('Error reverting todo:', error);
        setRecentlyReverted(prev => prev.filter(tid => tid !== id));
        return;
      }

      setTodos(prev =>
        prev.map(t => (t.id === id ? { ...t, is_complete: false, completed_at: null } : t))
      );
      setRecentlyReverted(prev => prev.filter(tid => tid !== id));
    }, 800);
  };

  const deleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) console.error('Error deleting todo:', error);
  };

  const moveTodo = (index: number, direction: 'up' | 'down') => {
    const newTodos = [...todos];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= todos.length) return;
    [newTodos[index], newTodos[target]] = [newTodos[target], newTodos[index]];
    setTodos(newTodos);
  };

  /* ---------- drag-and-drop handlers ---------- */
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (draggingIndex === null || dragOverIndex === null) return;
    const updated = [...todos];
    const [moved] = updated.splice(draggingIndex, 1);
    updated.splice(dragOverIndex, 0, moved);
    setTodos(updated);
    setDraggingIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  /* ---------- render helpers ---------- */
  const groupedCompletedTodos = React.useMemo(() => groupTodosByDate(todos), [todos]);

  // displayedTodos will now only refer to non-completed tasks for the current view
  const displayedTodos = todos.filter(t => !t.is_complete);

  const startEditingDetails = (todoId: string) => {
    setEditingDetailsMap(prev => ({ ...prev, [todoId]: true }));
    setDetailsMap(prev => {
      if (prev[todoId] !== undefined) {
        return prev;
      }
      const current = todos.find(todo => todo.id === todoId);
      return {
        ...prev,
        [todoId]: current?.detail ?? '',
      };
    });
  };

  const cancelEditingDetails = (todoId: string) => {
    const current = todos.find(todo => todo.id === todoId);
    setDetailsMap(prev => ({
      ...prev,
      [todoId]: current?.detail ?? '',
    }));
    setEditingDetailsMap(prev => {
      const next = { ...prev };
      delete next[todoId];
      return next;
    });
    setSavingStatusMap(prev => {
      if (prev[todoId] === undefined) return prev;
      return { ...prev, [todoId]: 'idle' };
    });
  };

  const saveDetails = async (todoId: string, details: string) => {
    setSavingStatusMap(prev => ({ ...prev, [todoId]: 'saving' }));
    try {
      const { data, error } = await supabase
        .from('todos')
        .update({ detail: details })
        .eq('id', todoId)
        .select();

      if (error) {
        console.error('Error updating details:', error);
        setSavingStatusMap(prev => ({ ...prev, [todoId]: 'error' }));
      } else {
        console.log('Details saved successfully for todo:', todoId);
        if (data && data.length) {
          setTodos(prev =>
            prev.map(todo =>
              todo.id === todoId ? { ...todo, detail: data[0].detail ?? '' } : todo
            )
          );
        } else {
          setTodos(prev =>
            prev.map(todo =>
              todo.id === todoId ? { ...todo, detail: details } : todo
            )
          );
        }
        setDetailsMap(prev => ({ ...prev, [todoId]: details }));
        setEditingDetailsMap(prev => {
          const next = { ...prev };
          delete next[todoId];
          return next;
        });
        setSavingStatusMap(prev => ({ ...prev, [todoId]: 'saved' }));
        setTimeout(() => {
          setSavingStatusMap(prev => ({ ...prev, [todoId]: 'idle' }));
        }, 2000); // Revert to idle after 2 seconds
        return true;
      }
    } catch (error) {
      console.error('Exception while saving details:', error);
      setSavingStatusMap(prev => ({ ...prev, [todoId]: 'error' }));
    }
    return false;
  };

  if (!user) return null;

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Your To-Do List</h1>

      {/* add box */}
      <div className="flex mb-4 gap-3">
        <input
          type="text"
          placeholder="Add new task"
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTodo();
            }
          }}
          className="flex-1 bg-white border border-gray-200 rounded-full px-6 py-3 text-base placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent hover:shadow-md transition-all duration-200 ease-out h-[52px]"
        />
        <button
          aria-label="Add new to-do"
          type="button"
          onClick={addTodo}
          className="inline-flex h-[52px] items-center gap-3 rounded-full bg-[#569866] px-6 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-lg font-bold leading-none text-white">
            +
          </span>
          <span className="hidden sm:inline whitespace-nowrap">Add To Do</span>
        </button>
      </div>

      {/* current / completed toggle */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowCompleted(false)}
          aria-pressed={!showCompleted}
          className={`inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            !showCompleted
              ? 'bg-[#569866] text-white focus:ring-green-400 shadow-sm hover:-translate-y-0.5 hover:shadow-lg'
              : 'bg-[#569866]/10 text-[#25603a] focus:ring-green-200 hover:bg-[#569866]/20'
          }`}
        >
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              !showCompleted ? 'bg-white/25 text-white' : 'bg-white text-[#25603a]'
            }`}
          >
            ▶︎
          </span>
          Current
        </button>
        <button
          type="button"
          onClick={() => setShowCompleted(true)}
          aria-pressed={showCompleted}
          className={`inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            showCompleted
              ? 'bg-[#569866] text-white focus:ring-green-400 shadow-sm hover:-translate-y-0.5 hover:shadow-lg'
              : 'bg-[#569866]/10 text-[#25603a] focus:ring-green-200 hover:bg-[#569866]/20'
          }`}
        >
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              showCompleted ? 'bg-white/25 text-white' : 'bg-white text-[#25603a]'
            }`}
          >
            ✓
          </span>
          Completed
        </button>
      </div>

      {/* Add audio element */}
      <audio ref={completionSoundRef} preload="auto">
        <source src="/hitmarker.wav" type="audio/wav" />
        Your browser does not support the audio element.
      </audio>

      {/* todo list */}
      <ul className="space-y-2">
        {/* Render grouped completed todos */}
        {showCompleted && groupedCompletedTodos && Object.entries(groupedCompletedTodos).map(([date, todosInGroup]) => (
          <React.Fragment key={date}>
            <li className="date-separator bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 rounded-md mt-3 mb-1">
              {date}
            </li>
            {todosInGroup.map(todo => {
              // const originalIndex = todos.findIndex(t => t.id === todo.id); // Less relevant for completed
              const isCompleting = recentlyCompleted.includes(todo.id); // Should be false here
              const isReverting = recentlyReverted.includes(todo.id);

              return (
                <li
                  key={todo.id}
                  // draggable is false when showCompleted is true
                  className={`
                    relative bg-white border border-gray-200 shadow-sm hover:shadow-md
                    overflow-hidden
                    ${isReverting ? 'opacity-0 transform -translate-y-4 my-0 h-0 overflow-hidden' : 'opacity-100'}
                    ${expandedIds.includes(todo.id) ? 'px-6 py-4 flex flex-col space-y-4' : 'flex items-center px-6 py-3'}
                  `}
                  style={{
                    borderRadius: '40px',
                    transition: 'all 800ms cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {/* row content */}
                  <div
                    className="w-full flex items-center cursor-pointer"
                    onClick={() => toggleExpand(todo.id)}
                  >
                    {/* completed icon */}
                    <div className="p-1">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="2" width="20" height="20" rx="4" stroke="#000" strokeWidth="2" />
                        <path
                          d="M6 12l4 4l8 -8"
                          stroke="#569866"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    {/* text & expand toggle */}
                    <span className="flex-1 px-2">{todo.content}</span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleExpand(todo.id);
                      }}
                      className="p-3 text-[#569866] text-2xl"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#569866" strokeWidth="2">
                        {expandedIds.includes(todo.id) ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        )}
                      </svg>
                    </button>

                    {/* action buttons */}
                    <div className="flex items-center space-x-1 ml-auto shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          revertTodo(todo.id);
                        }}
                        className="text-yellow-500 p-3 text-2xl"
                        title="Revert to active"
                      >
                        ↺
                      </button>
                      <div className="flex items-center">
                        <ContextMenu
                          menuButtonAriaLabel={`Options for to-do: ${todo.content}`}
                          items={[{
                            label: "Delete",
                            action: () => {
                              if (confirm('Delete this to-do item?')) {
                                deleteTodo(todo.id);
                              }
                            }
                          }]}
                        />
                      </div>
                    </div>
                  </div>

                  {/* details / expansion panel */}
                  {expandedIds.includes(todo.id) && (
                    <div className="mt-2 w-full border-t pt-2 animate-in fade-in duration-200 delay-150">
                      <p>Date Created: {formatDate(todo.created_at)}</p>
                      <p>
                        Date Completed:{' '}
                        {todo.completed_at ? formatDate(todo.completed_at) : 'N/A'}
                      </p>
                      <div className="mt-2">
                        <div className="flex items-center mb-2 gap-2">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              if (editingDetailsMap[todo.id]) {
                                cancelEditingDetails(todo.id);
                              } else {
                                startEditingDetails(todo.id);
                              }
                            }}
                            className={`
                              relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400
                              ${editingDetailsMap[todo.id]
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-[#569866]/10 text-[#25603a] hover:bg-[#569866]/20'}
                            `}
                          >
                            {editingDetailsMap[todo.id] ? (
                              <>
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">
                                  ×
                                </span>
                                Cancel Editing
                              </>
                            ) : (
                              <>
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#569866] text-white text-xs font-semibold">
                                  ✎
                                </span>
                                {detailsMap[todo.id] ? 'Edit Detail' : 'Add Detail'}
                              </>
                            )}
                          </button>
                        </div>
                        {editingDetailsMap[todo.id] ? (
                          <>
                            <textarea
                              id={`details-${todo.id}`}
                              aria-label="To-do detail notes"
                              value={detailsMap[todo.id] || ''}
                              onChange={e =>
                                setDetailsMap(prev => ({ ...prev, [todo.id]: e.target.value }))
                              }
                              className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                              rows={4}
                              placeholder="Use Markdown to add formatting (headings, lists, code, etc.)"
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={async () => {
                                  await saveDetails(todo.id, detailsMap[todo.id] || '');
                                }}
                                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                  savingStatusMap[todo.id] === 'saving'
                                    ? 'bg-[#d1f7e1] text-[#25603a] focus:ring-green-200'
                                    : 'bg-[#569866] text-white focus:ring-green-400 hover:-translate-y-0.5 hover:shadow-lg'
                                }`}
                                disabled={savingStatusMap[todo.id] === 'saving'}
                              >
                                {savingStatusMap[todo.id] === 'saving'
                                  ? 'Saving...'
                                  : savingStatusMap[todo.id] === 'saved'
                                  ? 'Saved!'
                                  : savingStatusMap[todo.id] === 'error'
                                  ? 'Error - Retry?'
                                  : 'Save'}
                              </button>
                            </div>
                            {savingStatusMap[todo.id] === 'error' && (
                              <p className="text-sm text-red-500 mt-1">
                                Could not save details. Please try again.
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                            {detailsMap[todo.id] ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                              >
                                {detailsMap[todo.id]}
                              </ReactMarkdown>
                            ) : (
                              <p className="text-gray-500 italic">No details provided.</p>
                            )}
                          </div>
                        )}
                        {savingStatusMap[todo.id] === 'saved' && !editingDetailsMap[todo.id] && (
                          <p className="text-sm text-green-600 mt-2">Details saved.</p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </React.Fragment>
        ))}

        {/* Render current (non-completed) todos */}
        {!showCompleted && displayedTodos.map(todo => {
          const originalIndex = todos.findIndex(t => t.id === todo.id);
          const isCompleting = recentlyCompleted.includes(todo.id);
          // const isReverting = recentlyReverted.includes(todo.id); // Not relevant for current todos

          /* ✅ updated tick CSS — works only on real hover devices */
          const tickPathClass = `
            transition-opacity duration-200
            ${isCompleting ? 'opacity-100' : 'opacity-0'}
            supports-[hover:hover]:group-hover:opacity-100
          `;

          return (
            <li
              key={todo.id}
              draggable={true} // always true for non-completed
              onDragStart={e => handleDragStart(e, originalIndex)}
              onDragOver={e => handleDragOver(e, originalIndex)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`
                relative bg-white border border-gray-200 shadow-sm hover:shadow-md
                overflow-hidden
                ${isCompleting ? 'opacity-0 transform -translate-y-4 my-0 h-0 overflow-hidden' : 'opacity-100'}
                ${expandedIds.includes(todo.id) ? 'px-6 py-4 flex flex-col space-y-4' : 'flex items-center px-6 py-3'}
                ${dragOverIndex === originalIndex && draggingIndex !== originalIndex ? 'border-2 border-dashed border-gray-400' : ''}
              `}
              style={{
                borderRadius: '40px',
                transition: 'all 800ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* row content */}
              <div
                className="w-full flex items-center cursor-pointer"
                onClick={() => toggleExpand(todo.id)}
              >
                {/* checkbox */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    completeTodo(todo.id);
                  }}
                  className="p-3 group"
                  aria-label="Complete todo"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="2" width="20" height="20" rx="4" stroke="#000" strokeWidth="2" />
                    <path
                      d="M6 12l4 4l8 -8"
                      stroke="#569866"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={tickPathClass}
                    />
                  </svg>
                </button>

                {/* text & expand toggle */}
                <span className="flex-1 px-2">{todo.content}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    toggleExpand(todo.id);
                  }}
                  className="p-3 text-[#569866] text-2xl"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#569866" strokeWidth="2">
                    {expandedIds.includes(todo.id) ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    )}
                  </svg>
                </button>

                {/* action buttons */}
                <div className="flex items-center space-x-1 ml-auto shrink-0">
                  {/* Hide up/down arrows on mobile, show on larger screens */}
                  <div className="hidden sm:flex items-center space-x-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        moveTodo(originalIndex, 'up');
                      }}
                      disabled={originalIndex === 0}
                      className="text-gray-500 disabled:opacity-50 p-3 text-2xl"
                    >
                      ↑
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        moveTodo(originalIndex, 'down');
                      }}
                      disabled={originalIndex === displayedTodos.length - 1}
                      className="text-gray-500 disabled:opacity-50 p-3 text-2xl"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="flex items-center">
                    <ContextMenu
                      menuButtonAriaLabel={`Options for to-do: ${todo.content}`}
                      items={[{
                        label: "Delete",
                        action: () => {
                          if (confirm('Delete this to-do item?')) {
                            deleteTodo(todo.id);
                          }
                        }
                      }]}
                    />
                  </div>
                </div>
              </div>

              {/* details / expansion panel */}
              {expandedIds.includes(todo.id) && (
                <div className="mt-2 w-full border-t pt-2 animate-in fade-in duration-200 delay-150">
                  <p>Date Created: {formatDate(todo.created_at)}</p>
                  {/* No Date Completed for current tasks */}
                  <div className="mt-2">
                    <div className="flex items-center mb-2 gap-2">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (editingDetailsMap[todo.id]) {
                            cancelEditingDetails(todo.id);
                          } else {
                            startEditingDetails(todo.id);
                          }
                        }}
                        className={`
                          relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400
                          ${editingDetailsMap[todo.id]
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-[#569866]/10 text-[#25603a] hover:bg-[#569866]/20'}
                        `}
                      >
                        {editingDetailsMap[todo.id] ? (
                          <>
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">
                              ×
                            </span>
                            Cancel Editing
                          </>
                        ) : (
                          <>
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#569866] text-white text-xs font-semibold">
                              ✎
                            </span>
                            {detailsMap[todo.id] ? 'Edit Detail' : 'Add Detail'}
                          </>
                        )}
                      </button>
                    </div>
                    {editingDetailsMap[todo.id] ? (
                      <>
                        <textarea
                          id={`details-${todo.id}`}
                          aria-label="To-do detail notes"
                          value={detailsMap[todo.id] || ''}
                          onChange={e =>
                            setDetailsMap(prev => ({ ...prev, [todo.id]: e.target.value }))
                          }
                          className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                          rows={4}
                          placeholder="Use Markdown to add formatting (headings, lists, code, etc.)"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={async () => {
                              await saveDetails(todo.id, detailsMap[todo.id] || '');
                            }}
                            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              savingStatusMap[todo.id] === 'saving'
                                ? 'bg-[#d1f7e1] text-[#25603a] focus:ring-green-200'
                                : 'bg-[#569866] text-white focus:ring-green-400 hover:-translate-y-0.5 hover:shadow-lg'
                            }`}
                            disabled={savingStatusMap[todo.id] === 'saving'}
                          >
                            {savingStatusMap[todo.id] === 'saving'
                              ? 'Saving...'
                              : savingStatusMap[todo.id] === 'saved'
                              ? 'Saved!'
                              : savingStatusMap[todo.id] === 'error'
                              ? 'Error - Retry?'
                              : 'Save'}
                          </button>
                        </div>
                        {savingStatusMap[todo.id] === 'error' && (
                          <p className="text-sm text-red-500 mt-1">
                            Could not save details. Please try again.
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                        {detailsMap[todo.id] ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {detailsMap[todo.id]}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-gray-500 italic">No details provided.</p>
                        )}
                      </div>
                    )}
                    {savingStatusMap[todo.id] === 'saved' && !editingDetailsMap[todo.id] && (
                      <p className="text-sm text-green-600 mt-2">Details saved.</p>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}

        {/* drag target at end - only for non-completed */}
        {!showCompleted && displayedTodos.length > 0 && (
          <li
            className={`h-6 ${
              dragOverIndex === todos.length && draggingIndex !== null
                ? 'border-2 border-dashed border-gray-400 rounded'
                : ''
            }`}
            onDragOver={e => {
              e.preventDefault();
              setDragOverIndex(todos.length);
            }}
            onDrop={handleDrop}
          />
        )}
      </ul>
    </main>
  );
}

(TodosPage as any).auth = true;
export default TodosPage;
