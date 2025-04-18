# App Development Rules: To-Do & Habit Tracker

## General Principles
- Keep the app simple, clean, and intuitive.
- Prioritize user experience over feature complexity.
- Optimize for performance and responsiveness.
- Ensure data integrity across sessions and devices.

## Architecture
- Use a modular structure (separate logic for UI, database, auth, analytics).
- Backend powered by [Supabase](https://supabase.com/).
- Frontend built in JavaScript, ideally with a framework like React or Vue.

## To-Do List Rules
1. Tasks are entered via a single text input box only (no inline editing).
2. Tasks appear at the top of the list when added.
3. Completed tasks are either deleted or pushed to the bottom (based on user setting).
4. Tasks can be manually reordered via drag-and-drop.
5. No hard categories, folders, or priority levels (keep it minimal for now).

## Habit Tracker Rules
1. Users can add unlimited habits.
2. Habits are tracked daily (optionally weekly/monthly in future updates).
3. Each habit is represented visually in a grid (inspired by GitHub contribution graphs).
4. A percentage tracker shows completion rate over time.
5. Past days can be edited if a user forgets to mark a habit.

## Notifications
- Users can optionally opt-in to habit reminders.
- Reminders are sent once per day at a user-specified time.

## Data & Storage
- All tasks and habit data is stored securely via Supabase.
- Supabase handles user authentication and syncing.
- App should function offline with local caching and sync when back online (stretch goal).

## UI/UX
- The app will have three main views:
  - Main summary page (high-level to-dos + habit percentages).
  - Detailed to-do view (full list, editable).
  - Detailed habit view (grid + performance insights).
- UI must be responsive and mobile-friendly.
- No ads or interruptions.

## Development Guidelines
- Version control with Git (feature branches for new features).
- Use ESLint and Prettier for consistent code formatting.
- Include unit tests for core logic (especially data handling and calculations).
- Deploy using Vercel or Netlify (if going web-based).

## Security
- Minimal user data collected.
- Use Supabase auth to protect user-specific data.
- No third-party tracking or analytics unless explicitly approved.

