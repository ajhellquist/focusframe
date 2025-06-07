import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../components/AuthProvider';
import ContextMenu from '../components/ContextMenu';
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

  // Add these states to track recently toggled habits
  const [recentlyCompleted, setRecentlyCompleted] = useState<string[]>([]);
  const [recentlyUncompleted, setRecentlyUncompleted] = useState<string[]>([]);
  
  // Add states for inline expansion
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Add states for habit editing modes
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [editingDateHabitId, setEditingDateHabitId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState('');

  // Add audio reference
  const completionSoundRef = React.useRef<HTMLAudioElement | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeletingHabitId(id);
  };

  const handleDeleteConfirm = async (id: string) => {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting habit:', error.message);
      return;
    }
    
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setDeletingHabitId(null);
  };

  const handleDeleteCancel = () => {
    setDeletingHabitId(null);
  };
  const handleEditDateClick = (id: string) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    setEditingDateHabitId(id);
    setEditDateValue(habit.createdDate);
  };

  const handleEditDateSubmit = async (id: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDateValue)) {
      return;
    }
    const dateObj = parseLocalDate(editDateValue);
    if (isNaN(dateObj.getTime())) {
      return;
    }
    const todayStr = getLocalDateString(today);
    if (editDateValue > todayStr) {
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
    setEditingDateHabitId(null);
    setEditDateValue('');
  };

  const handleEditDateCancel = () => {
    setEditingDateHabitId(null);
    setEditDateValue('');
  };

  const handleEditDateKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleEditDateSubmit(id);
    } else if (e.key === 'Escape') {
      handleEditDateCancel();
    }
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
  const addHabit = async (title: string) => {
    if (!title.trim() || !user) return;
    const { data, error } = await supabase
      .from('habits')
      .insert([{ title: title.trim(), user_id: user.id }])
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      await addHabit(inputValue);
      setInputValue('');
      setIsExpanded(false);
    }
  };

  // Handle escape key to cancel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInputValue('');
      setIsExpanded(false);
    }
  };
  // Toggle completion for a habit on the current date
  const toggleHabit = async (id: string) => {
    if (!user) return;
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const isDone = habit.completedDates.includes(dateStr);
    
    // Add to animation tracking state based on the action
    if (!isDone) {
      setRecentlyCompleted(prev => [...prev, id]);
    } else {
      setRecentlyUncompleted(prev => [...prev, id]);
    }
    
    // Set a timeout to update the database after animation starts
    setTimeout(async () => {
      if (!isDone) {
        const { error } = await supabase
          .from('habit_completions')
          .insert([{ habit_id: id, completed_date: dateStr }]);
        if (error) {
          console.error('Error marking completion:', error.message);
          // Remove from animation state if there was an error
          setRecentlyCompleted(prev => prev.filter(habitId => habitId !== id));
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
          // Remove from animation state if there was an error
          setRecentlyUncompleted(prev => prev.filter(habitId => habitId !== id));
          return;
        }
      }
      
      // Update local state
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
      
      // Play completion sound only when marking complete (not when unchecking)
      if (!isDone && completionSoundRef.current) {
        completionSoundRef.current.play();
      }
      
      // Remove from animation states after a delay
      setTimeout(() => {
        if (!isDone) {
          setRecentlyCompleted(prev => prev.filter(habitId => habitId !== id));
        } else {
          setRecentlyUncompleted(prev => prev.filter(habitId => habitId !== id));
        }
      }, 100);
      
    }, 500); // Changed from 700ms to 500ms
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
              className="p-3 text-xl bg-white rounded shadow disabled:opacity-50 hover:bg-gray-100 disabled:hover:bg-white"
            >
              &lt;
            </button>
            <h1 className="text-xl font-semibold">{formatDate(currentDate)}</h1>
            <button
              onClick={goNext}
              disabled={dateStr === getLocalDateString(today)}
              className="p-3 text-xl bg-white rounded shadow disabled:opacity-50 hover:bg-gray-100 disabled:hover:bg-white"
            >
              &gt;
            </button>
          </div>
          <div className="relative">
            {!isExpanded ? (
              <button
                onClick={() => setIsExpanded(true)}
                className="bg-green-500 text-white font-medium text-base px-6 py-3 shadow-md hover:scale-105 hover:brightness-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transform transition-all duration-300 ease-out h-[52px] flex items-center justify-center"
                style={{ borderRadius: '40px' }}
              >
                <span className="font-bold text-lg">+</span>
                <span className="hidden sm:inline ml-2">Add Habit</span>
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter habit name..."
                    className="h-[52px] px-6 py-3 text-base border-2 border-green-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-600 transition-all duration-300 ease-out shadow-md"
                    style={{ 
                      borderRadius: '40px',
                      minWidth: '280px',
                      background: 'white'
                    }}
                    autoFocus
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="submit"
                      disabled={!inputValue.trim()}
                      className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <span className="text-sm font-bold">✓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputValue('');
                        setIsExpanded(false);
                      }}
                      className="w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center hover:bg-gray-500 transition-all duration-200"
                    >
                      <span className="text-sm">✕</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
        
        {/* Add audio element */}
        <audio ref={completionSoundRef} preload="auto">
          <source src="/hitmarker.wav" type="audio/wav" />
          Your browser does not support the audio element.
        </audio>
        
        <div className="space-y-4">
          {habits
            .filter((habit) => habit.createdDate <= dateStr)
            .map((habit) => {
              const done = habit.completedDates.includes(dateStr);
              const isCompleting = recentlyCompleted.includes(habit.id);
              const isUncompleting = recentlyUncompleted.includes(habit.id);
              const isDeleting = deletingHabitId === habit.id;
              const isEditingDate = editingDateHabitId === habit.id;
              
              if (isEditingDate) {
                return (
                  <div
                    key={habit.id}
                    className="relative bg-white border-2 border-blue-400 shadow-md px-6 py-3"
                    style={{ borderRadius: '40px' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-lg font-medium">Edit start date for "{habit.title}"</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="date"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          onKeyDown={(e) => handleEditDateKeyDown(e, habit.id)}
                          className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                          max={getLocalDateString(today)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditDateSubmit(habit.id)}
                          className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-all duration-200"
                        >
                          <span className="text-sm font-bold">✓</span>
                        </button>
                        <button
                          onClick={handleEditDateCancel}
                          className="w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center hover:bg-gray-500 transition-all duration-200"
                        >
                          <span className="text-sm">✕</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isDeleting) {
                return (
                  <div
                    key={habit.id}
                    className="relative bg-red-50 border-2 border-red-300 shadow-md px-6 py-3"
                    style={{ borderRadius: '40px' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-lg text-red-700">Delete "{habit.title}"?</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDeleteConfirm(habit.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 font-medium"
                        >
                          Delete
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          className="px-4 py-2 bg-gray-400 text-white rounded-full hover:bg-gray-500 transition-all duration-200 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div
                  key={habit.id}
                  className={`
                    relative bg-white border border-gray-200 shadow-sm hover:shadow-md
                    flex items-center justify-between px-6 py-3
                  `}
                  style={{
                    borderRadius: '40px',
                    transition: 'all 800ms cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {/* Left: completion box and title */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleHabit(habit.id)}
                      className="p-3 relative group"
                      aria-label={done ? `Mark ${habit.title} incomplete` : `Mark ${habit.title} complete`}
                    >
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* The black box is always visible */}
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="20"
                          rx="4"
                          stroke="#000000"
                          strokeWidth="2"
                        />
                        
                        {/* The checkmark fades in/out with animation */}
                        {(done || isCompleting) && (
                          <path
                            d="M6 12l4 4l8 -8"
                            stroke={isCompleting ? "#4ade80" : "#569866"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`
                              transition-all duration-500 ease-out
                              ${isUncompleting ? 'opacity-0' : 'opacity-100'}
                            `}
                            style={{
                              transform: isCompleting ? 'scale(2)' : 'scale(1)',
                              transformOrigin: 'center'
                            }}
                          />
                        )}
                        
                        {/* Show hover state checkmark for unchecked items */}
                        {!done && !isCompleting && (
                          <path
                            d="M6 12l4 4l8 -8"
                            stroke="#569866"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-opacity duration-200 opacity-0 group-hover:opacity-30"
                          />
                        )}
                      </svg>
                    </button>
                    <span className="text-lg">{habit.title}</span>
                  </div>
                  {/* Right: Context Menu */}
                  <div className="flex items-center">
                    <ContextMenu
                      menuButtonAriaLabel={`Options for ${habit.title}`}
                      items={[
                        { label: "Change start date", action: () => handleEditDateClick(habit.id) },
                        { label: "Delete", action: () => handleDeleteClick(habit.id) }
                      ]}
                    />
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
