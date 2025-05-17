# FocusFrame - To-Do & Habit Tracker App

A comprehensive productivity application for tracking daily habits and managing to-do lists with a clean, modern interface.

![FocusFrame Logo](./focusframelogosimple.png)

## Features

### Authentication
- Email/password signup and login
- Protected routes with authentication state management
- Secure session handling with Supabase Auth

### To-Do Management
- Create, read, update, and delete to-do items
- Mark items as complete/incomplete
- Add detailed notes to each to-do item
- View completion timestamps
- Drag-and-drop reordering
- Filter between active and completed tasks
- Real-time updates with Supabase subscriptions

### Habit Tracking
- Create and manage daily habits
- Track habit completion with calendar-based history
- View completion rates and streaks
- Backdate habit creation for accurate tracking
- Navigate through historical habit data

### Dashboard
- Overview of active to-dos
- Habit completion statistics with visual indicators
- Weekly progress tracking with percentage change
- Donut chart visualizations for habit completion rates

## Tech Stack

- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Context API and local state
- **Real-time Updates**: Supabase Realtime subscriptions

## Setup

1. Clone the repository

2. Install dependencies  
   ```bash
   npm install
   ```

3. Create a `.env.local` in the project root with your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Folder Structure

- **pages**: Next.js pages and API routes
  - `_app.tsx`: Main application wrapper with auth provider
  - `index.tsx`: Login page
  - `signup.tsx`: User registration
  - `dashboard.tsx`: Main overview with statistics
  - `todos.tsx`: To-do list management
  - `habits.tsx`: Habit tracking interface

- **components**: Reusable UI components
  - `AuthProvider.tsx`: Authentication context provider
  - `Layout.tsx`: Common layout with navigation

- **styles**: Global styles and Tailwind configuration
  - `globals.css`: Global CSS and Tailwind imports

- **lib**: Utility functions and service connections
  - `supabaseClient.ts`: Supabase client configuration

- **public**: Static assets including logos and icons

## Design Guidelines

### Color Palette
- Primary Green: `#569866` (Used for buttons, checkmarks, and accents)
- Background: `bg-gray-50` (Light gray background)
- UI Elements: White backgrounds with shadows for cards
- Accent Colors:
  - Red: `#ef4444` (For delete actions and negative metrics)
  - Blue: `#3b82f6` (For links and secondary actions)

### Typography
- Font Family: System default sans-serif
- Heading Sizes:
  - Page Titles: `text-2xl font-bold`
  - Card Titles: `text-lg font-semibold`
- Body Text: `text-base` or `text-sm` for secondary information

### UI Components
- Cards: White background with rounded corners and subtle shadows
  - `bg-white p-4 rounded shadow`
- Buttons:
  - Primary: `bg-[#569866] text-white px-4 py-2 rounded shadow`
  - Secondary: `bg-gray-200 text-gray-700 px-4 py-2 rounded`
- Form Inputs: `border rounded p-2`
- Interactive Elements: Hover effects with scale transformations
  - `hover:-translate-y-1 hover:shadow-lg`

## Supabase Database Setup

Before using the app, set up your Supabase project with the required tables and RLS policies:

### Tables Structure

1. **todos**
```sql
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  content text not null,
  is_complete boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  detail text
);

alter table public.todos enable row level security;

-- RLS Policies
create policy "Users can select their todos" on public.todos
  for select using (auth.uid() = user_id);
create policy "Users can insert their todos" on public.todos
  for insert with check (auth.uid() = user_id);
create policy "Users can update their todos" on public.todos
  for update using (auth.uid() = user_id);
create policy "Users can delete their todos" on public.todos
  for delete using (auth.uid() = user_id);
```

2. **habits**
```sql
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.habits enable row level security;

-- RLS Policies
create policy "Users can select their habits" on public.habits
  for select using (auth.uid() = user_id);
create policy "Users can insert their habits" on public.habits
  for insert with check (auth.uid() = user_id);
create policy "Users can update their habits" on public.habits
  for update using (auth.uid() = user_id);
create policy "Users can delete their habits" on public.habits
  for delete using (auth.uid() = user_id);
```

3. **habit_completions**
```sql
create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  completed_date date not null,
  created_at timestamptz not null default now(),
  unique(habit_id, completed_date)
);

alter table public.habit_completions enable row level security;

-- RLS Policies
create policy "Users can select their habit completions" on public.habit_completions
  for select using (
    exists (
      select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()
    )
  );
create policy "Users can insert their habit completions" on public.habit_completions
  for insert with check (
    exists (
      select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()
    )
  );
create policy "Users can delete their habit completions" on public.habit_completions
  for delete using (
    exists (
      select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()
    )
  );
```

## Future Enhancements

- Mobile responsive design improvements
- Dark mode support
- Offline data synchronization
- Recurring to-do items
- Categories and tags for to-dos
- Habit streak rewards and gamification
- Data export/import functionality
- Calendar view integration

## License

MIT