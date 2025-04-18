 # To-Do & Habit Tracker App

 **Tech Stack:** Next.js (TypeScript), Tailwind CSS, Supabase

 ## Setup

 1. Install dependencies  
    `npm install`

 2. Create a `.env.local` in the project root with your Supabase credentials:

    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

 3. Run the development server:

    `npm run dev`

 ## Folder Structure

 - pages: Next.js pages  
 - styles: Tailwind CSS globals  
 - lib: Supabase client  
 - components: (future UI components)

 ## Next Steps

-- Implement authentication flows  
-- Build To-Do and Habit pages and components  
-- Add state management and offline sync

## Supabase Database Setup

Before using the app, make sure your Supabase project has the required tables and RLS policies. In your Supabase dashboard SQL editor, run:

```sql
-- Create the todos table
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  content text not null,
  is_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.todos enable row level security;

-- Policy: allow users to select their own todos
create policy "Users can select their todos" on public.todos
  for select using (auth.uid() = user_id);

-- Policy: allow users to insert their own todos
create policy "Users can insert their todos" on public.todos
  for insert with check (auth.uid() = user_id);

-- Policy: allow users to update their own todos
create policy "Users can update their todos" on public.todos
  for update using (auth.uid() = user_id);

-- Policy: allow users to delete their own todos
create policy "Users can delete their todos" on public.todos
  for delete using (auth.uid() = user_id);
```
Now, add the tables and policies to support habits tracking:

```sql
-- Create the habits table
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null,
  created_at timestamptz not null default now()
);

-- Create the habit_completions table to track daily completions
create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  completed_date date not null,
  created_at timestamptz not null default now(),
  unique(habit_id, completed_date)
);

-- Enable Row Level Security for habits and completions
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

-- Policies for habits
create policy "Users can select their habits" on public.habits
  for select using (auth.uid() = user_id);
create policy "Users can insert their habits" on public.habits
  for insert with check (auth.uid() = user_id);
create policy "Users can update their habits" on public.habits
  for update using (auth.uid() = user_id);
create policy "Users can delete their habits" on public.habits
  for delete using (auth.uid() = user_id);

-- Policies for habit_completions
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