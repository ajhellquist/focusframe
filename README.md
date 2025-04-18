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

 - Implement authentication flows  
 - Build To-Do and Habit pages and components  
 - Add state management and offline sync