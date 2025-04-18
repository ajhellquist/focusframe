import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

type Habit = {
  id: string;
  title: string;
  created_at: string;
};

type HabitEntry = {
  id: string;
  habit_id: string;
  date: string;
  is_complete: boolean;
};

function HabitsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entriesMap, setEntriesMap] = useState<{ [key: string]: HabitEntry[] }>({});
  const [newHabit, setNewHabit] = useState<string>('');

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      } else {
        setUser(session.user);
        fetchHabits(session.user.id);
      }
    })();
  }, [router]);

  const fetchHabits = async (userId: string) => {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else {
      setHabits(data || []);
      if (data && data.length > 0) {
        fetchEntries(data.map((h) => h.id));
      }
    }
  };

  const fetchEntries = async (habitIds: string[]) => {
    const { data, error } = await supabase
      .from('habit_entries')
      .select('*')
      .in('habit_id', habitIds);
    if (error) console.error(error);
    else {
      const map: { [key: string]: HabitEntry[] } = {};
      (data || []).forEach((entry) => {
        if (!map[entry.habit_id]) map[entry.habit_id] = [];
        map[entry.habit_id].push(entry);
      });
      setEntriesMap(map);
    }
  };

  const addHabit = async () => {
    if (!newHabit.trim()) return;
    const { error } = await supabase
      .from('habits')
      .insert([{ title: newHabit, user_id: user.id }]);
    if (error) console.error(error);
    else {
      setNewHabit('');
      fetchHabits(user.id);
    }
  };

  const toggleEntry = async (habitId: string, date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const existing = entriesMap[habitId]?.find((e) => e.date === dateString);
    if (existing) {
      const { error } = await supabase
        .from('habit_entries')
        .update({ is_complete: !existing.is_complete })
        .eq('id', existing.id);
      if (error) console.error(error);
    } else {
      const { error } = await supabase
        .from('habit_entries')
        .insert([{ habit_id: habitId, date: dateString, is_complete: true }]);
      if (error) console.error(error);
    }
    fetchEntries([habitId]);
  };

  // Generate last 30 days
  const today = new Date();
  const days: Date[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Habits | To-Do & Habit Tracker</title>
      </Head>
      <main className="min-h-screen p-8 bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Habit Tracker</h1>
        <div className="flex mb-4">
          <input
            type="text"
            placeholder="New habit name"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            className="flex-1 border rounded p-2 mr-2"
          />
          <button onClick={addHabit} className="bg-green-600 text-white rounded px-4">
            Add
          </button>
        </div>
        <div className="space-y-8">
          {habits.map((habit) => (
            <div key={habit.id} className="bg-white p-4 rounded shadow-sm">
              <h2 className="font-semibold mb-2">{habit.title}</h2>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const dateString = day.toISOString().split('T')[0];
                  const entry = entriesMap[habit.id]?.find((e) => e.date === dateString);
                  const done = entry?.is_complete;
                  return (
                    <div
                      key={dateString}
                      onClick={() => toggleEntry(habit.id, day)}
                      className={`w-6 h-6 cursor-pointer rounded ${done ? 'bg-green-500' : 'bg-gray-300'}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

// Mark this page as requiring authentication
(HabitsPage as any).auth = true;

export default HabitsPage;
