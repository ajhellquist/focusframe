import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

type Todo = {
  id: string;
  content: string;
  is_complete: boolean;
  created_at: string;
  completed_at?: string | null;
  detail?: string | null;
};

function TodosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState<string>('');
  // Drag-and-drop state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // Toggle view: false = current todos, true = completed todos
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  // Expansion state for todo items
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  // Details text state for todos
  const [detailsMap, setDetailsMap] = useState<Record<string, string>>({});
  // Toggle expansion of todo item
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Format date string nicely
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString();

  // Save details for a todo item to Supabase and update local state
  const saveDetails = async (id: string, details: string) => {
    setDetailsMap((prev) => ({ ...prev, [id]: details }));
    const { data: updatedData, error } = await supabase
      .from('todos')
      .update({ detail: details })
      .eq('id', id)
      .select('*');
    if (error) console.error('Error updating details:', error);
    else if (updatedData && updatedData.length > 0) {
      const updated = updatedData[0] as Todo;
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  };

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
      // Subscribe to real-time changes on todos for this user
      todoChannel = supabase
        .channel('todos_changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
          (payload) => {
            const newTodo = payload.new as Todo;
            setTodos((prev) => [newTodo, ...prev]);
            setDetailsMap((prev) => ({ ...prev, [newTodo.id]: newTodo.detail ?? '' }));
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
          (payload) => {
            const updated = payload.new as Todo;
            setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setDetailsMap((prev) => ({ ...prev, [updated.id]: updated.detail ?? '' }));
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
          (payload) => {
            const deleted = payload.old as Todo;
            setTodos((prev) => prev.filter((t) => t.id !== deleted.id));
            setDetailsMap((prev) => {
              const newMap = { ...prev };
              delete newMap[deleted.id];
              return newMap;
            });
          }
        )
        .subscribe();
    })();
    return () => {
      if (todoChannel) {
        supabase.removeChannel(todoChannel);
      }
    };
  }, [router]);

  const fetchTodos = async (userId: string) => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else if (data) {
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

    // Persist to Supabase and prepend the returned row
    // Insert a new todo and get the returned row
    const insertResp = await supabase
      .from('todos')
      .insert([{ content: text, user_id: user.id }])
      .select('*');
    const data = insertResp.data as Todo[] | null;
    const error = insertResp.error;
    if (error) {
      console.error('Error adding todo:', error);
      return;
    }
    if (data && data.length > 0) {
      const newItem = data[0];
      setTodos((prev) => [newItem, ...prev]);
      setDetailsMap((prev) => ({ ...prev, [newItem.id]: newItem.detail ?? '' }));
    }
  };

  const completeTodo = async (id: string) => {
    // Optimistically mark complete and set completion timestamp in UI
    const completedAt = new Date().toISOString();
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, is_complete: true, completed_at: completedAt }
          : t
      )
    );
    const { data: updatedData, error } = await supabase
      .from('todos')
      .update({ is_complete: true, completed_at: completedAt })
      .eq('id', id)
      .select('*');
    if (error) console.error('Error completing todo:', error);
    else if (updatedData && updatedData.length > 0) {
      const updated = updatedData[0] as Todo;
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  };
  
  // Revert a completed todo back to active
  const revertTodo = async (id: string) => {
    // Optimistically mark as not complete and clear completion timestamp
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, is_complete: false, completed_at: null } : t
      )
    );
    const { data: updatedData, error } = await supabase
      .from('todos')
      .update({ is_complete: false, completed_at: null })
      .eq('id', id)
      .select('*');
    if (error) {
      console.error('Error reverting todo:', error);
    } else if (updatedData && updatedData.length > 0) {
      const updated = updatedData[0] as Todo;
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  };

  const deleteTodo = async (id: string) => {
    // Optimistically remove from UI
    setTodos((prev) => prev.filter((t) => t.id !== id));
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
  // Drag-and-drop handlers
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

  // Filter todos based on toggle state
  const displayedTodos = todos.filter((t) =>
    showCompleted ? t.is_complete : !t.is_complete
  );

  if (!user) return null;

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Your To-Do List</h1>
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Add new task"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTodo();
            }
          }}
          className="flex-1 border rounded p-2 mr-2"
        />
        <button
          type="button"
          onClick={addTodo}
          className="bg-blue-600 text-white rounded px-4"
        >
          Add
        </button>
      </div>
      {/* Toggle between current and completed todos */}
      <div className="flex mb-4 space-x-2">
        <button
          onClick={() => setShowCompleted(false)}
          className={`px-4 py-2 rounded ${
            !showCompleted ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Current
        </button>
        <button
          onClick={() => setShowCompleted(true)}
          className={`px-4 py-2 rounded ${
            showCompleted ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Completed
        </button>
      </div>
      <ul className="space-y-2">
        {displayedTodos.map((todo, idx) => {
          const originalIndex = todos.findIndex((t) => t.id === todo.id);
          return (
            <li
              key={todo.id}
              draggable={!showCompleted}
              {...(!showCompleted
                ? {
                    onDragStart: (e) => handleDragStart(e, originalIndex),
                    onDragOver: (e) => {
                      e.preventDefault();
                      setDragOverIndex(originalIndex);
                    },
                    onDrop: handleDrop,
                    onDragEnd: handleDragEnd,
                  }
                : {})}
              className={`bg-white rounded shadow ${
                expandedIds.includes(todo.id) ? 'p-4 flex flex-col space-y-4' : 'flex items-center p-2'
              } ${
                !showCompleted && dragOverIndex === originalIndex && draggingIndex !== originalIndex
                  ? 'border-2 border-dashed border-gray-400'
                  : ''
              }`}
            >
              <div className="w-full flex items-center">
                <button
                  onClick={() => toggleExpand(todo.id)}
                  className="text-blue-500 mr-2"
                >
                  {expandedIds.includes(todo.id) ? '▼' : '▶'}
                </button>
                <span className="flex-1">{todo.content}</span>
                <div className="flex items-center space-x-2">
                  {!showCompleted && (
                    <>
                      <button
                        onClick={() => completeTodo(todo.id)}
                        className="text-green-500"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => moveTodo(originalIndex, 'up')}
                        disabled={originalIndex === 0}
                        className="text-gray-500 disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveTodo(originalIndex, 'down')}
                        disabled={originalIndex === todos.length - 1}
                        className="text-gray-500 disabled:opacity-50"
                      >
                        ↓
                      </button>
                    </>
                  )}
                  {showCompleted && (
                    <button
                      onClick={() => revertTodo(todo.id)}
                      className="text-yellow-500"
                      title="Revert to active"
                    >
                      ↺
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // confirm before deleting
                      if (confirm('Are you sure you want to delete this to-do item?')) {
                        deleteTodo(todo.id);
                      }
                    }}
                    className="text-red-500"
                  >
                    🗑
                  </button>
                </div>
              </div>
              {expandedIds.includes(todo.id) && (
                <div className="mt-2 w-full border-t pt-2">
                  <p>Date Created: {formatDate(todo.created_at)}</p>
                  <p>Date Completed: {todo.completed_at ? formatDate(todo.completed_at) : 'N/A'}</p>
                  <div className="mt-2">
                    <label
                      htmlFor={`details-${todo.id}`}
                      className="block mb-1 font-medium"
                    >
                      Details:
                    </label>
                    <textarea
                      id={`details-${todo.id}`}
                      value={detailsMap[todo.id] || ''}
                      onChange={(e) =>
                        setDetailsMap((prev) => ({
                          ...prev,
                          [todo.id]: e.target.value,
                        }))
                      }
                      onBlur={(e) => saveDetails(todo.id, e.target.value)}
                      className="w-full border rounded p-2"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {!showCompleted && (
          <li
            className={`h-6 ${
              dragOverIndex === todos.length && draggingIndex !== null
                ? 'border-2 border-dashed border-gray-400 rounded'
                : ''
            }`}
            onDragOver={(e) => {
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

// Mark this page as requiring authentication
(TodosPage as any).auth = true;

export default TodosPage;
