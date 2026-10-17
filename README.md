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

## Tasks, Calendar, Projects, Goals

Dashboard opens by default with the weekly score and workforms. Plan shows your work and progress toward four focused hours. Tasks captures work before scheduling it. Press Enter to add an unscheduled task. Scheduled and past tasks remain in this list. Completed tasks are hidden by default; use Show completed to see or reopen them. This filter only changes Tasks, not the calendar or Goals. Choose Add date or the displayed date to open the two-field task editor. Scheduling puts the same task on the calendar and keeps you in Tasks. Clear its date to remove it from the calendar without removing it from the list.

Month shows a full-width Monday-to-Sunday calendar. On mobile, select a date in the compact grid to see that day's tasks below it. All weekends stay visible. There is no separate Unscheduled rail.

Year shows twelve months with markers for planned and completed actions. Choose a month or date to open Month. Navigation arrows step through months in Month and years in Year/Goals. Today returns to the current period.

Goals supports up to four goals per year. Choose Add goal to name an outcome in a dialog, list its actions, then open an action to give it a date in task details. It is the same task in Goals and Month: completion, dates and timer history stay in sync. Existing notes are preserved in saved data and backups. Rename a goal without changing its action links. Removing a goal asks for confirmation and keeps all actions and dates.

Task editing starts with a title and an optional date. Expand Organise to link the task to a project and a goal. Clear the date to make a task unscheduled. Completion stays on the task row. Actions created under a goal are linked automatically. Existing notes, progress notes, goal links and session history are retained when editing. Capture work in Tasks or use a day’s plus button to add one in a dialog. Drag between days in Month, or use Alt (Option) with Left/Right to move a date and Up/Down to reorder. In Goals, Up/Down reorders that goal's actions across dates; dragging is disabled there.

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

Calendar has one navigation tab with a Month/Year switch in its toolbar. It remembers the scale when switching tabs. Projects uses the same title-and-checklist layout as Goals, without a year or count limit. Projects have an independent Active/Completed state; changing it keeps task completion unchanged. Tasks can link to both a project and a goal under Organise. Removing either group keeps the tasks, dates, notes and other links.

Navigation lives in a collapsible left sidebar with icons. Its width preference is saved in this browser. Phones use a compact icon rail; backup, theme and help controls stay grouped at the bottom.

Weekly tracks recurring commitments with one checkbox per required completion. Tick several in one sitting; each tick automatically records today's date on a shared, unscheduled task. Untick to reopen that completion. Previous weeks retain their targets and records and are read-only for completion ticks. Existing batch records remain available, including notes and dates.

Weekly uses the shared Task model. Completion slots keep checkbox positions stable when reopening an item. Removing a routine retains its tasks and other weeks.

Existing tasks can link to a routine under Organise. Completing a linked, dated task counts toward that day in Weekly without creating a second task.

Plan provides four one-hour blocks and a fixed four-hour daily goal. Each block has a free-text intention and an optional existing task link. Starting an unlinked intention creates a shared unscheduled task. Intentions are saved with the focus session and workform history. Blocks have no clock times; use Calendar for scheduling. The same task can fill several blocks. Quick capture assigns a new shared task to the first empty block or adds an hour when all are assigned. Previous and next day controls show separate saved plans and earned hours. Additional completed hours can exceed the goal without moving it. Legacy saved clock times remain readable but are not shown or required.

Start hour begins a fixed 60-minute session on today's plan. Only one session can run; Resume focus reopens it after closing the dialog or reloading. At the end, a required workform asks what you worked on. Draft workforms persist with the active session. Submitting saves the text in the existing task's session history. A block counts once only after a full 60 minutes and a submitted workform. Stopped sessions retain their actual time and workform but do not count as completed hours. Task completion stays independent. Completed blocks retain their task assignment and visible workforms. The daily count shows earned hours against a fixed four-hour goal. Additional blocks can exceed the goal without changing it.

Plan uses one compact sheet of hour rows and a four-segment progress display. A full submitted hour earns one segment; reaching four shows Daily goal reached. Task labels remain accessible without repeating visible field headings. The next assigned hour has the primary Start action. Quick capture creates an unscheduled shared task and assigns it to the first empty block, or adds an hour when the existing blocks are all assigned. Previous-day navigation shows that day’s earned hours.

Dialogs share a stable top position and scroll within the viewport when expanded. Focus-panel state classes are separate from form-layout classes, so workforms stack at full width. Input sizing, wrapping action footers and nested unsaved-change prompts work on phones. Keyboard focus returns to Add after checklist removal, to Undo after task deletion, and to the restored task after Undo. Undo clears group links if the group was removed in the meantime, preventing unreadable saved state.

Plan offers Mark done for an hour worked without the timer. Submit a short workform to record the hour; it turns green and earns one green progress segment. Four hours fill the goal bar. View workform opens saved reflections in a modal, keeping the plan free of expanding sections. Recording an hour does not complete its linked task.

Each Plan hour has one editable workform. Stopped sessions carry notes and recorded minutes forward; resumed timers show the remaining time. Existing workforms for the same hour are consolidated on load, retaining their text. When a workform already exists, Mark done completes the hour immediately without reopening the form. View workform edits the reflection without adding another hour.

Dashboard is the home screen. A Monday–Sunday scorecard shows completed Plan hours against four hours per day (28 per week), days at goal, best day, and the previous week’s total. Each completed hour counts once using the same records as Plan. Partial sessions do not count until completed. The dated workform list opens full reflections in a modal. Previous-week navigation and a direct Plan action support review and getting back to work. Competition is against the user’s previous week, with no invented participants or separate score storage.
