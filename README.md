# Ultrafocussed

A minimalist weekly planner for personal work. Capture tasks, give them a day, and focus on what matters.

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

## Planner

- Type in Unscheduled and press Enter to capture a task, or use Add task on any day.
- Drag tasks between days and into a different order. A line shows where the task will land.
- Keyboard alternative to dragging: focus a task and press Alt (Option) with Up or Down to reorder, or Left or Right to move it one day.
- Open a task to edit its title, notes, and planning date. Quick dates offer Unscheduled, Today, Tomorrow, and Next Monday.
- Choose one main outcome per day. Moving an outcome into a day that already has one preserves that day's existing choice.
- Complete and reopen tasks. Delete with Undo.
- Browse weeks and reveal weekends. On mobile, choose a day from the week strip and open Unscheduled separately.
- Unfinished tasks stay on their original date and appear under From earlier, with a one-click move to today. Nothing automatically rolls forward.

## Plan and focus

The calendar follows the toolbar directly. Choose the timer on an open task to focus on it inside task details: set a next step and pick 1 to 180 minutes. Existing weekly outcome links remain saved, but their selector is hidden. Stop early whenever you like. When the session ends, optionally complete the task, set the next step, and finish. No written update is required. Optional progress notes live in task details. Task details can also start focus and keep notes and session history. An active task’s timer shows a live countdown; an ended session shows Done. Either timer opens its session controls.

An active session survives reloads and uses elapsed wall-clock time. Returning after its end opens the finish controls. Recorded time is capped at the planned duration; leaving the tab open overnight does not add extra hours. Only one session can be active in this planner at a time. No four-hour target, scores, streaks, sounds, or notifications are required.

Outcomes, next steps, progress history, and the active session are included in JSON backups. Older version 1 backups remain readable. Deleting a task removes its history too; Undo restores it. Finish the session before deleting the task with the active session.

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
