# UltraFocussed

Plan focused hours, record what you did, and keep a weekly score. The daily goal is four hours.

## Run locally

Use Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The dev server polls file changes so edits from external tools refresh reliably.

## How it works

- **Dashboard** is home. Review the Monday–Sunday scorecard, compare with last week, and read completed workforms inline.
- **Plan** starts with four one-hour blocks. Write an intention and start the timer. No task selection or setup is required. Add another hour if needed; the goal stays at four.
- **Workforms** describe what you actually did. Each planned hour has one saved workform. Stopping early saves the minutes and draft; resuming continues the remaining time. Mark done records an hour already worked. If notes are already submitted, it completes in one click. Completed hours turn green and count once.
- **Tasks** is the brain dump. Capture a title, optionally add a date, and hide completed tasks by default. Task completion is separate from recording a focused hour.
- **Calendar** switches between Month and Year. Past days are grey. Date changes, dragging and keyboard moves update the same tasks.
- **Projects and Goals** group shared tasks. Projects can be active or completed; annual goals are limited to four. Removing a group keeps its tasks and notes.
- **Weekly** has one checkbox per required routine completion. Tick several in one sitting; the day is recorded automatically. Saved weeks retain their targets and completion records.

The sidebar collapses to icons. Light and dark preferences are remembered. Task editing keeps legacy notes and focus history intact. Deleting a task offers Undo.

## Saved data

The planner is local to this browser and origin. There are no accounts, cloud sync, analytics or team features. Other tabs receive updates, but simultaneous edits are last-write-wins rather than merged. Moving to another domain, browser or machine requires exporting and importing a backup.

Use **Export backup** in the sidebar regularly. Import validates a JSON backup before asking to replace the planner. Clearing site data removes the local planner. The app does not encrypt browser storage or backup files.

If storage cannot be read, editing is locked and the original stored value is left intact. Download the raw saved data, retry, or restore a valid backup. Failed writes keep changes in memory and offer retry/export. An unexpected rendering failure provides a recovery screen without clearing storage.

## Verify and release

```sh
npm run verify
npm audit --audit-level=high
npm run preview
```

`verify` checks formatting, application and test types, model/UI tests, and the production build. CI runs the same checks plus the dependency audit. `dist/` is the static release artifact. Preview tests the built app with a restrictive security policy; it is not a production server.

See [deployment requirements](docs/deployment.md), [architecture](ARCHITECTURE.md), and the [production audit](docs/production-audit.md).
