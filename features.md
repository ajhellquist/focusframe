# Feature Stack: To-Do & Habit Tracker App

## Core Features

### 1. Unified Dashboard
- Displays a summary of:
  - Current to-dos
  - Habit completion percentage (today + rolling average)
- Acts as the default home page for the user

### 2. To-Do List
- Clean input bar at the top (similar to a chat interface)
- Newly added tasks appear at the top
- Tasks can be:
  - Marked as complete
  - Deleted
  - Reordered via drag-and-drop
- No inline edits or additional categories
- Optionally persist completed tasks at the bottom for the day

### 3. Habit Tracker
- Users can create an unlimited number of habits
- Each habit is tracked daily
- Grid-style visualization (GitHub-style contribution heatmap)
- Past days can be retroactively marked complete or incomplete
- Tracks overall completion percentage and streaks
- Optional habit reminders (daily at user-set time)

### 4. Navigation & Views
- Main Dashboard: high-level overview of habits and to-dos
- To-Do View: full screen list, sortable and manageable
- Habit View: visual grid for each habit and percentage breakdown
- Mobile-optimized layout

### 5. User Authentication
- Email/password login via Supabase Auth
- Data tied to user account
- Automatic sync across sessions/devices

### 6. Data Persistence
- All user data stored in Supabase tables
- Support for offline mode (local cache with auto-sync when online)
- Tasks and habits saved in real-time

### 7. Notifications (Optional)
- Habit reminder system
- Daily push/email reminder (stretch goal: custom per habit)

### 8. Visual Insights (Stretch Goal)
- Habit streak tracker
- Charts showing weekly/monthly progress
- Leaderboards or friendly competition (optional future enhancement)

