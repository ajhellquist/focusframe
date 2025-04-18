import React, { useState } from 'react';
import Head from 'next/head';

type Habit = {
  id: string;
  title: string;
  // List of dates (YYYY-MM-DD) on which this habit was completed
  completedDates: string[];
};

export default function HabitsPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(today);

  // TODO: Replace with real data from Supabase
  const sampleHabits: Habit[] = [
    { id: '1', title: 'Drink Water', completedDates: ['2025-04-17', '2025-04-18'] },
    { id: '2', title: 'Meditate', completedDates: ['2025-04-18'] },
    { id: '3', title: 'Run 5km', completedDates: [] },
  ];

  const formatDate = (date: Date) =>
    date.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });

  const goPrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1);
      return d;
    });
  };
  const goNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      return next > today ? today : next;
    });
  };

  const dateStr = currentDate.toISOString().split('T')[0];

  return (
    <>
      <Head>
        <title>Habits | To-Do & Habit Tracker</title>
      </Head>
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={goPrev}
              className="p-2 bg-white rounded shadow hover:bg-gray-100"
            >
              &lt;
            </button>
            <h1 className="text-xl font-semibold">{formatDate(currentDate)}</h1>
            <button
              onClick={goNext}
              disabled={dateStr === today.toISOString().split('T')[0]}
              className="p-2 bg-white rounded shadow disabled:opacity-50 hover:bg-gray-100 disabled:hover:bg-white"
            >
              &gt;
            </button>
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">
            + Add Habit
          </button>
        </div>
        <div className="space-y-4">
          {sampleHabits.map((habit) => {
            const done = habit.completedDates.includes(dateStr);
            return (
              <div
                key={habit.id}
                className="flex items-center justify-between bg-white p-4 rounded shadow"
              >
                <span className="text-lg">{habit.title}</span>
                <span
                  className={done ? 'text-green-500 text-2xl' : 'text-red-500 text-2xl'}
                >
                  {done ? '✔️' : '✖️'}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

(HabitsPage as any).auth = true;
