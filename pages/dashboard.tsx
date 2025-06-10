import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
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
 * Parse a YYYY-MM-DD date string as a Date in local timezone at midnight.
 */
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map((x) => parseInt(x, 10));
  return new Date(year, month - 1, day);
};

// Types for dashboard data
type Habit = {
  id: string;
  title: string;
  createdDate: string;        // YYYY-MM-DD
  completedDates: string[];   // list of YYYY-MM-DD
};
type Todo = {
  id: string;
  content: string;
  is_complete: boolean;
  created_at: string;
  completed_at: string | null;
  detail: string | null;
};
function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  // Dashboard state: habits and top todos
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
      } else {
        setUser(session.user);
      }
    };
    getSession();
  }, [router]);
  
  // Load habits and top 5 active todos when user is set
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const userId = user.id;
      // Fetch habits with completions
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('id, title, created_at, habit_completions(completed_date)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (habitsError) {
        console.error('Error loading habits:', habitsError.message || habitsError);
      } else if (habitsData) {
        const formatted = habitsData.map((h: any) => ({
          id: h.id,
          title: h.title,
          // convert UTC timestamp to local YYYY-MM-DD
          createdDate: getLocalDateString(new Date(h.created_at)),
          completedDates: (h.habit_completions || []).map((c: any) => c.completed_date),
        }));
        setHabits(formatted);
      }
      // Fetch top 5 active todos
      const { data: todosData, error: todosError } = await supabase
        .from('todos')
        .select('id, content, is_complete, created_at, completed_at, detail')
        .eq('user_id', userId)
        .eq('is_complete', false)
        .order('created_at', { ascending: false })
        .limit(5);
      if (todosError) {
        console.error('Error loading todos:', todosError.message || todosError);
      } else if (todosData) {
        setTodos(todosData as Todo[]);
      }
    };
    loadData();
  }, [user]);


  if (!user) {
    return null;
  }
  // Prepare metrics
  // Local dates for today and 7 days ago
  const today = new Date();
  const dateStr = getLocalDateString(today);
  const baselineDate = new Date(today);
  baselineDate.setDate(today.getDate() - 7);
  const baselineDateStr = getLocalDateString(baselineDate);
  // helper: days difference between two YYYY-MM-DD strings (inclusive difference is +1 later)
  const daysBetween = (a: string, b: string) => {
    const d1 = parseLocalDate(a);
    const d2 = parseLocalDate(b);
    const msInDay = 1000 * 60 * 60 * 24;
    return Math.floor((d2.getTime() - d1.getTime()) / msInDay);
  };
  // Metrics per habit: total days, completion rate, current streak
  const habitMetrics = habits.map((h) => {
    const totalDays = daysBetween(h.createdDate, dateStr) + 1;
    const completedCount = h.completedDates.length;
    const completionRate = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
    // compute current streak
    let streak = 0;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = getLocalDateString(d);
      if (h.completedDates.includes(ds)) streak++;
      else break;
    }
    // baseline completion rate 7 days ago
    let baselineRate = 0;
    if (daysBetween(h.createdDate, baselineDateStr) >= 0) {
      const totalDaysBaseline = daysBetween(h.createdDate, baselineDateStr) + 1;
      const completedCountBaseline = h.completedDates.filter((d) => d <= baselineDateStr).length;
      baselineRate = totalDaysBaseline > 0 ? Math.round((completedCountBaseline / totalDaysBaseline) * 100) : 0;
    }
    const percentChange = completionRate - baselineRate;
    return { ...h, totalDays, completedCount, completionRate, streak, percentChange };
  });
  // Habit card component for rendering each habit with donut chart
  const HabitCard = ({ title, streak, completionRate, percentChange, completedDates }: { title: string; streak: number; completionRate: number; percentChange: number; completedDates: string[]; }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    
    // Generate 12 weeks of data for GitHub-style calendar organized by weeks
    const generateCalendarData = () => {
      const weeks = [];
      const today = new Date();
      
      // Start from 12 weeks ago (84 days)
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 83); // 83 days ago + today = 84 days total
      
      // Find the Sunday before our start date to align weeks properly
      const startSunday = new Date(startDate);
      startSunday.setDate(startDate.getDate() - startDate.getDay());
      
      // Create 12 weeks
      for (let week = 0; week < 12; week++) {
        const weekDays = [];
        for (let day = 0; day < 7; day++) {
          const currentDate = new Date(startSunday);
          currentDate.setDate(startSunday.getDate() + (week * 7) + day);
          const dateStr = getLocalDateString(currentDate);
          const isCompleted = completedDates.includes(dateStr);
          const isInRange = currentDate >= startDate && currentDate <= today;
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayOfWeekName = dayNames[currentDate.getDay()];
          
          weekDays.push({
            date: dateStr,
            completed: isCompleted,
            inRange: isInRange,
            dayOfWeek: dayOfWeekName
          });
        }
        weeks.push(weekDays);
      }
      return weeks;
    };
    
    const calendarWeeks = generateCalendarData();
    
    // Calculate optimal square size to fit within card
    // Card dimensions: 350px width, 290px height
    // Available space: subtract padding (32px total) and text height (~80px)
    const availableWidth = 350 - 32 - 16; // 32px padding + 16px margin from borders
    const availableHeight = 290 - 80 - 32 - 16; // ~80px for text, 32px padding, 16px margin
    
    // 12 weeks + 11 gaps between weeks
    const maxSquareWidth = Math.floor((availableWidth - (12 - 1) * 2) / 12); // 2px gap between weeks
    // 7 days + 6 gaps between days  
    const maxSquareHeight = Math.floor((availableHeight - (7 - 1) * 1) / 7); // 1px gap between days
    
    // Use the smaller dimension and cap at reasonable size
    const squareSize = Math.min(maxSquareWidth, maxSquareHeight, 12);
    const weekGap = Math.max(1, Math.floor(squareSize * 0.2)); // 20% of square size
    const dayGap = Math.max(1, Math.floor(squareSize * 0.1)); // 10% of square size
    
    // Increase radius to 72 for a larger donut
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - completionRate / 100);
    return (
      <section 
        data-card-type="habit" 
        className="bg-white p-4 shadow-sm hover:shadow-md border-2 border-gray-200 h-[290px] w-[350px] hover:scale-105 transition-all duration-300 cursor-pointer relative preserve-3d"
        style={{borderRadius: '24px', perspective: '1000px'}}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`absolute inset-0 w-full h-full transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{transformStyle: 'preserve-3d'}}
        >
          {/* Front side - Donut Chart */}
          <div className="absolute inset-0 w-full h-full p-4 backface-hidden" style={{backfaceVisibility: 'hidden', borderRadius: '24px'}}>
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-sm text-gray-600 mb-4">Current Streak: {streak} days</p>
            <div className="flex justify-center">
              <svg width="160" height="160" viewBox="0 0 160 160" className="transition-all duration-300">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="url(#progressGradient)"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform="rotate(-90 80 80)"
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
                <text
                  x="50%"
                  y="35%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="text-xs fill-current text-gray-500"
                >
                  Completion Rate
                </text>
                <text
                  x="50%"
                  y="45%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="text-sm fill-current text-gray-700"
                >
                  {completionRate}%
                </text>
                <text
                  x="50%"
                  y="55%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="text-xs fill-current text-gray-500"
                >
                  Weekly Change
                </text>
                <text
                  x="50%"
                  y="65%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="text-xs"
                  fill={percentChange >= 0 ? '#549866' : '#ef4444'}
                >
                  {percentChange >= 0 ? `+${percentChange}%` : `${percentChange}%`}
                </text>
              </svg>
            </div>
          </div>

          {/* Back side - GitHub Calendar */}
          <div 
            className="absolute inset-0 w-full h-full p-4 backface-hidden rotate-y-180" 
            style={{backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '24px'}}
          >
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-xs text-gray-600 mb-3">12 Week History</p>
            <div className="flex justify-center px-2 py-1">
              {/* Day of week labels */}
              <div className="flex flex-col mr-2" style={{gap: `${dayGap}px`}}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, index) => (
                  <div
                    key={index}
                    className="text-xs text-gray-500 flex items-center justify-center"
                    style={{
                      width: `${Math.max(squareSize * 0.8, 8)}px`,
                      height: `${squareSize}px`
                    }}
                  >
                    {dayLabel}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="flex" style={{gap: `${weekGap}px`}}>
                {calendarWeeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col" style={{gap: `${dayGap}px`}}>
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`rounded-sm ${
                          !day.inRange 
                            ? 'bg-transparent' 
                            : day.completed 
                              ? 'bg-green-500' 
                              : 'bg-gray-200'
                        }`}
                        style={{
                          width: `${squareSize}px`,
                          height: `${squareSize}px`
                        }}
                        title={day.inRange ? `${day.dayOfWeek}, ${day.date}: ${day.completed ? 'Completed' : 'Not completed'}` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <>
      <Head>
        <title>FocusFrame</title>
      </Head>
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Welcome, {user.email}</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Top 5 To-Dos card */}
          <section data-card-type="todo" className="bg-white p-4 shadow-sm hover:shadow-md border-2 border-gray-200 h-[290px] w-[350px] hover:scale-105 transition-all duration-300" style={{borderRadius: '24px'}}>
            <h2 className="text-lg font-semibold mb-2">Top 5 To-Dos</h2>
            <ul className="space-y-2">
              {todos.length > 0 ? (
                todos.map((todo) => (
                  <li
                    key={todo.id}
                    className="flex justify-between items-center"
                  >
                    <span>{todo.content}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(todo.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No active to-dos found.</li>
              )}
            </ul>
          </section>
          {/* Habit cards */}
          {habitMetrics.map((hm) => (
            <HabitCard
              key={hm.id}
              title={hm.title}
              streak={hm.streak}
              completionRate={hm.completionRate}
              percentChange={hm.percentChange}
              completedDates={hm.completedDates}
            />
          ))}
        </div>
      </main>
    </>
  );
}

// Mark this page as requiring authentication
(Dashboard as any).auth = true;

export default Dashboard;