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