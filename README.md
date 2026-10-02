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

- Add tasks to Unscheduled or directly to a day.
- Drag tasks between days and into a different order.
- Open a task to edit its title, notes, and planning date. Up and Down buttons offer a keyboard alternative to dragging.
- Choose one main outcome per day. Moving an outcome into a day that already has one preserves that day's existing choice.
- Complete and reopen tasks. Delete with Undo.
- Browse weeks and reveal weekends. On mobile, choose a day from the week strip and open Unscheduled separately.
- Unfinished tasks stay on their original date and appear under Needs a decision. Nothing automatically rolls forward.

## Data and backups

Tasks are saved to local storage in this browser on this device. No account, server, or cloud sync is included. Other tabs at the same origin receive saved updates. Simultaneous edits in different tabs are not conflict-merged.

Clearing browser site data removes the planner. Use Export backup to download a JSON copy and Import backup to restore it. Import replaces the current planner after confirmation. Export first to preserve the current tasks.

If saved data cannot be read, editing is locked and existing storage is left intact. Retry or restore a valid backup. If a write fails, changes remain in memory and the app warns you to retry or export before leaving.

## Checks

```sh
npm test
npm run build
npm run format:check
```

Model tests cover persistence format, invalid data, local calendar dates, week boundaries, moving and reordering, completion, and main outcomes. Browser verification is recorded in [docs/verification.md](docs/verification.md).
