# Ultrafocussed

A personal War Map: see the year, plan the month, and turn a few clear goals into scheduled actions.

## Run locally

Requires Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The dev server polls file changes every 500 ms so edits from external tools reliably refresh the preview. For a production build:

```sh
npm run build
npm run preview
```

## Tasks, Year, Month, Goals

Tasks is the default view for capturing work before scheduling it. Press Enter to add an unscheduled task. Scheduled and past tasks remain in this list. Completed tasks are hidden by default; use Show completed to see or reopen them. This filter only changes Tasks, not the calendar or Goals. Choose Add date or the displayed date to open the two-field task editor. Scheduling puts the same task on the calendar and keeps you in Tasks. Clear its date to remove it from the calendar without removing it from the list.

Month shows a full-width Monday-to-Sunday calendar. On mobile, select a date in the compact grid to see that day's tasks below it. All weekends stay visible. There is no separate Unscheduled rail.

Year shows twelve months with markers for planned and completed actions. Choose a month or date to open Month. Navigation arrows step through months in Month and years in Year/Goals. Today returns to the current period.

Goals supports up to four goals per year. Choose Add goal to name an outcome in a dialog, list its actions, then open an action to give it a date in task details. It is the same task in Goals and Month: completion, dates and timer history stay in sync. Existing notes are preserved in saved data and backups. Rename a goal without changing its action links. Removing a goal asks for confirmation and keeps all actions and dates.

Task editing has just a title and an optional date. Clear the date to make a task unscheduled. Completion stays on the task row. Actions created under a goal are linked automatically. Existing notes, progress notes, goal links and session history are retained when editing. Capture work in Tasks or use a day’s plus button to add one in a dialog. Drag between days in Month, or use Alt (Option) with Left/Right to move a date and Up/Down to reorder. In Goals, Up/Down reorders that goal's actions across dates; dragging is disabled there.

Focus is a separate timer action on the task row. Its dialog asks only for minutes, defaulting to 60 and accepting 1 to 180. Stop early or let the timer expire, then finish the session. Closing the dialog keeps an active session running; its row timer reopens it. Reloads preserve sessions without opening dialogs. Finishing records time without changing completion or asking for notes. Recorded time is capped at the planned duration. No scores, streaks, sounds or daily-hour target.

Unfinished tasks stay on their date and remain visible in Tasks. Nothing automatically rolls forward. Complete and reopen tasks; Delete offers Undo.

## Appearance

Use the sun or moon in the header to switch between light and dark mode. The first visit follows the system preference; an explicit choice is remembered in this browser separately from planner data.

## Data and backups

Tasks are saved to local storage in this browser on this device. No account, server, or cloud sync is included. Other tabs at the same origin receive saved updates. Simultaneous edits in different tabs are not conflict-merged.

Clearing browser site data removes the planner. Use Export in the top bar to download a JSON copy and Import to restore it. Import replaces the current planner after confirmation. Export first to preserve the current tasks.

If saved data cannot be read, editing is locked and existing storage is left intact. Retry, restore a valid backup, or download the saved data as it is stored. Export is disabled in this state because there is no readable planner to export. If a write fails, changes remain in memory and the app warns you to retry or export before leaving.

## Checks

```sh
npm test
npm run build
npm run format:check
```

Model tests cover persistence format, invalid data, local calendar dates, week boundaries, moving and reordering, completion, and main outcomes. Browser verification is recorded in [docs/verification.md](docs/verification.md).
