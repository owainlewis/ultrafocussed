# Ultrafocussed

A personal War Map: see the year, plan the month, and turn a few clear goals into scheduled actions.

## Run locally

Requires Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For a production build:

```sh
npm run build
npm run preview
```

## Year, Month, Goals

Month is the default view. Desktop shows a Monday-to-Sunday month with tasks in each date cell and an Unscheduled rail. On mobile, select a date in the compact grid to see that day's tasks below it. All weekends stay visible.

Year shows twelve months with markers for planned and completed actions. Choose a month or date to open Month. Navigation arrows step through months in Month and years in Year/Goals. Today returns to the current period.

Goals supports up to four goals per year. Add a goal, list its actions, then choose Schedule on an action to give it a date in task details. It is the same task in Goals and Month: notes, completion, dates and timer history stay in sync. Rename a goal without changing its action links. Removing a goal asks for confirmation and keeps all actions and dates.

Task details can assign or clear a goal, set a planning date, choose the daily main outcome, and keep notes and progress notes. Capture tasks in Unscheduled or directly on a day. Drag between days in Month, or use Alt (Option) with Left/Right to move a date and Up/Down to reorder. In Goals, Up/Down reorders that goal's actions across dates; dragging is disabled there.

Focus sessions default to 60 minutes and accept 1 to 180 minutes. Timers show a live countdown on active tasks and Done after stopping or expiry. Session controls stay in task details. Reloads preserve active sessions without opening extra panels. Finish requires no written update and preserves task drafts. Recorded time is capped at the planned duration. No scores, streaks, sounds or daily-hour target.

Unfinished tasks stay on their date and appear in From earlier. Nothing automatically rolls forward. Complete and reopen tasks; Delete offers Undo.

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
