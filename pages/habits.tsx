import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../components/AuthProvider';
/**
 * Get a YYYY-MM-DD date string for a Date in the local timezone.
 */
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
/**
 * Parse a YYYY-MM-DD date string as a Date in the local timezone at midnight.
 */
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map((x) => parseInt(x, 10));
  return new Date(year, month - 1, day);
};

// Habit structure in UI
type Habit = {
  id: string;
  title: string;
  // ISO date (YYYY-MM-DD) when this habit was created
  createdDate: string;
  // List of dates (YYYY-MM-DD) on which this habit was completed
  completedDates: string[];
};

export default function HabitsPage() {
  const { user } = useAuth();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(today);
  // Habit list loaded from Supabase
  const [habits, setHabits] = useState<Habit[]>([]);
  // Determine earliest creation date among habits (or today if none)
  const earliestDate = useMemo(() => {
    if (habits.length === 0) return today;
    return habits.reduce((earliest, habit) => {
      const d = new Date(habit.createdDate);
      return d < earliest ? d : earliest;
    }, today);
  }, [habits]);
  const earliestDateStr = getLocalDateString(earliestDate);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this habit?')) {
      setHabits((prev) => prev.filter((h) => h.id !== id));
    }
  };
  /**
   * Edit the creation date of a habit (backdate or change).
   */
  const handleEdit = async (id: string) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const newDate = prompt(
      `Enter new creation date for "${habit.title}" (YYYY-MM-DD):`,
      habit.createdDate
    );
    if (!newDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      alert('Invalid date format. Please use YYYY-MM-DD.');
      return;
    }
    const dateObj = parseLocalDate(newDate);
    if (isNaN(dateObj.getTime())) {
      alert('Invalid date. Please enter a valid date.');
      return;
    }
    const todayStr = getLocalDateString(today);
    if (newDate > todayStr) {
      alert('Creation date cannot be in the future.');
      return;
    }
    // Update in Supabase
    const isoTimestamp = dateObj.toISOString();
    const { data: updated, error } = await supabase
      .from('habits')
      .update({ created_at: isoTimestamp })
      .eq('id', id)
      .select('created_at')
      .single();
    if (error) {
      console.error('Error updating creation date:', error.message);
      return;
    }
    const updatedDate = getLocalDateString(new Date(updated.created_at));
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, createdDate: updatedDate }
          : h
      )
    );
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });

  const goPrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1);
      return d < earliestDate ? earliestDate : d;
    });
  };
  const goNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      return next > today ? today : next;
    });
  };

  const dateStr = getLocalDateString(currentDate);

  // Load habits and completions for current user
  useEffect(() => {
    if (!user) return;
    const loadHabits = async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('id, title, created_at, habit_completions(completed_date)')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error loading habits:', error.message);
        return;
      }
      const loaded = data.map((h: any) => ({
        id: h.id,
        title: h.title,
        // convert UTC timestamp to local YYYY-MM-DD
        createdDate: getLocalDateString(new Date(h.created_at)),
        completedDates: (h.habit_completions || []).map((c: any) => c.completed_date),
      }));
      setHabits(loaded);
    };
    loadHabits();
  }, [user]);

  // Add a new habit via Supabase
  const addHabit = async () => {
    const title = prompt('Enter new habit name:');
    if (!title || !user) return;
    const { data, error } = await supabase
      .from('habits')
      .insert([{ title, user_id: user.id }])
      .select('id, title, created_at')
      .single();
    if (error) {
      console.error('Error adding habit:', error.message);
      return;
    }
    // convert UTC timestamp to local YYYY-MM-DD
    const createdDate = getLocalDateString(new Date(data.created_at));
    const newHabit: Habit = {
      id: data.id,
      title: data.title,
      createdDate,
      completedDates: [],
    };
    setHabits((prev) => [...prev, newHabit]);
  };
  // Toggle completion for a habit on the current date
  const toggleHabit = async (id: string) => {
    if (!user) return;
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const isDone = habit.completedDates.includes(dateStr);
    if (!isDone) {
      const { error } = await supabase
        .from('habit_completions')
        .insert([{ habit_id: id, completed_date: dateStr }]);
      if (error) {
        console.error('Error marking completion:', error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', id)
        .eq('completed_date', dateStr);
      if (error) {
        console.error('Error removing completion:', error.message);
        return;
      }
    }
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              completedDates: isDone
                ? h.completedDates.filter((d) => d !== dateStr)
                : [...h.completedDates, dateStr],
            }
          : h
      )
    );
  };

  return (
    <>
      <Head>
        <title>FocusFrame</title>
      </Head>
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={goPrev}
              disabled={dateStr === earliestDateStr}
              className="p-2 bg-white rounded shadow disabled:opacity-50 hover:bg-gray-100 disabled:hover:bg-white"
            >
              &lt;
            </button>
            <h1 className="text-xl font-semibold">{formatDate(currentDate)}</h1>
            <button
              onClick={goNext}
              disabled={dateStr === getLocalDateString(today)}
              className="p-2 bg-white rounded shadow disabled:opacity-50 hover:bg-gray-100 disabled:hover:bg-white"
            >
              &gt;
            </button>
          </div>
          <button
            onClick={addHabit}
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
          >
            + Add Habit
          </button>
        </div>
        <div className="space-y-4">
          {habits
            .filter((habit) => habit.createdDate <= dateStr)
            .map((habit) => {
              const done = habit.completedDates.includes(dateStr);
              return (
                <div
                  key={habit.id}
                  className="flex items-center justify-between bg-white p-4 rounded shadow"
                >
                  {/* Left: completion box and title */}
                  <div className="flex items-center space-x-2">
                    {done ? (
                      <button
                        onClick={() => toggleHabit(habit.id)}
                        className="p-1"
                        aria-label={`Mark ${habit.title} incomplete`}
                      >
                        <svg
                          className="w-6 h-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="2"
                            y="2"
                            width="20"
                            height="20"
                            rx="4"
                            stroke="#000000"
                            strokeWidth="2"
                          />
                          <path
                            d="M6 12l4 4l8 -8"
                            stroke="#569866"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleHabit(habit.id)}
                        className="p-1 group"
                        aria-label={`Mark ${habit.title} complete`}
                      >
                        <svg
                          className="w-6 h-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="2"
                            y="2"
                            width="20"
                            height="20"
                            rx="4"
                            stroke="#000000"
                            strokeWidth="2"
                          />
                          <path
                            d="M6 12l4 4l8 -8"
                            stroke="#569866"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                          />
                        </svg>
                      </button>
                    )}
                    <span className="text-lg">{habit.title}</span>
                  </div>
                  {/* Right: edit and delete */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(habit.id)}
                      className="text-blue-500 hover:text-blue-700"
                      aria-label={`Edit creation date for ${habit.title}`}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(habit.id)}
                      className="text-red-500 hover:text-red-700"
                      aria-label={`Delete habit ${habit.title}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </main>
    </>
  );
}

(HabitsPage as any).auth = true;
