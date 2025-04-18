import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

type Todo = {
  id: string;
  content: string;
  is_complete: boolean;
  created_at: string;
};

function TodosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState<string>('');

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      } else {
        setUser(session.user);
        fetchTodos(session.user.id);
      }
    })();
  }, [router]);

  const fetchTodos = async (userId: string) => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else if (data) setTodos(data);
  };

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    const { error } = await supabase
      .from('todos')
      .insert([{ content: newTodo, user_id: user.id }]);
    if (error) console.error(error);
    else {
      setNewTodo('');
      fetchTodos(user.id);
    }
  };

  const completeTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_complete: true })
      .eq('id', id);
    if (error) console.error(error);
    else fetchTodos(user.id);
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);
    if (error) console.error(error);
    else fetchTodos(user.id);
  };

  const moveTodo = (index: number, direction: 'up' | 'down') => {
    const newTodos = [...todos];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= todos.length) return;
    [newTodos[index], newTodos[target]] = [newTodos[target], newTodos[index]];
    setTodos(newTodos);
  };

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
          className="flex-1 border rounded p-2 mr-2"
        />
        <button
          onClick={addTodo}
          className="bg-blue-600 text-white rounded px-4"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {todos.map((todo, idx) => (
          <li
            key={todo.id}
            className="flex items-center bg-white p-2 rounded shadow"
          >
            <span className="flex-1">{todo.content}</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => moveTodo(idx, 'up')}
                disabled={idx === 0}
                className="text-gray-500 disabled:opacity-50"
              >
                ↑
              </button>
              <button
                onClick={() => moveTodo(idx, 'down')}
                disabled={idx === todos.length - 1}
                className="text-gray-500 disabled:opacity-50"
              >
                ↓
              </button>
              <button
                onClick={() => completeTodo(todo.id)}
                className="text-green-500"
              >
                ✓
              </button>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-red-500"
              >
                🗑
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

// Mark this page as requiring authentication
(TodosPage as any).auth = true;

export default TodosPage;
