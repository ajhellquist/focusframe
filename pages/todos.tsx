// pages/todos.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import ContextMenu from '../components/ContextMenu';

type Todo = {
  id: string;
  content: string;
  is_complete: boolean;
  created_at: string;
  completed_at?: string | null;
  detail?: string | null;
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

  const saveDetails = async (todoId: string, details: string) => {
    setSavingStatusMap(prev => ({ ...prev, [todoId]: 'saving' }));
    try {
      const { error } = await supabase
        .from('todos')
        .update({ detail: details })
        .eq('id', todoId)
        .select();

      if (error) {
        console.error('Error updating details:', error);
        setSavingStatusMap(prev => ({ ...prev, [todoId]: 'error' }));
      } else {
        console.log('Details saved successfully for todo:', todoId);
        setSavingStatusMap(prev => ({ ...prev, [todoId]: 'saved' }));
        setTimeout(() => {
          setSavingStatusMap(prev => ({ ...prev, [todoId]: 'idle' }));
        }, 2000); // Revert to idle after 2 seconds
      }
    } catch (error) {
      console.error('Exception while saving details:', error);
      setSavingStatusMap(prev => ({ ...prev, [todoId]: 'error' }));
    }
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
          onClick={addTodo}
          className="bg-green-500 text-white font-medium text-base px-6 py-3 shadow-md hover:scale-105 hover:brightness-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transform transition-all duration-200 ease-out h-[52px] flex items-center justify-center"
          style={{ borderRadius: '40px' }}
        >
          <span className="font-bold text-lg">+</span>
          <span className="hidden sm:inline ml-2">Add To Do</span>
        </button>
      </div>

      {/* current / completed toggle */}
      <div className="flex mb-4 space-x-2">
        <button
          onClick={() => setShowCompleted(false)}
          className={`font-medium text-base px-6 py-3 shadow-md hover:scale-105 hover:brightness-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 transform transition-all duration-200 ease-out ${
            !showCompleted ? 'bg-[#569866] text-white focus:ring-green-400' : 'bg-gray-200 text-gray-700 focus:ring-gray-400'
          }`}
          style={{ borderRadius: '40px' }}
        >
          Current
        </button>
        <button
          onClick={() => setShowCompleted(true)}
          className={`font-medium text-base px-6 py-3 shadow-md hover:scale-105 hover:brightness-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 transform transition-all duration-200 ease-out ${
            showCompleted ? 'bg-[#569866] text-white focus:ring-green-400' : 'bg-gray-200 text-gray-700 focus:ring-gray-400'
          }`}
          style={{ borderRadius: '40px' }}
        >
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
                        <label htmlFor={`details-${todo.id}`} className="block mb-1 font-medium">
                          Details:
                        </label>
                        <textarea
                          id={`details-${todo.id}`}
                          value={detailsMap[todo.id] || ''}
                          onChange={e =>
                            setDetailsMap(prev => ({ ...prev, [todo.id]: e.target.value }))
                          }
                          className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                          rows={3}
                        />
                        <button
                          onClick={() => saveDetails(todo.id, detailsMap[todo.id] || '')}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg text-sm mt-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
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
                    <label htmlFor={`details-${todo.id}`} className="block mb-1 font-medium">
                      Details:
                    </label>
                    <textarea
                      id={`details-${todo.id}`}
                      value={detailsMap[todo.id] || ''}
                      onChange={e =>
                        setDetailsMap(prev => ({ ...prev, [todo.id]: e.target.value }))
                      }
                      className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-200"
                      rows={3}
                    />
                    <button
                      onClick={() => saveDetails(todo.id, detailsMap[todo.id] || '')}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg text-sm mt-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
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
