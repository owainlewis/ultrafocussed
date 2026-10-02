# Planner verification

Verified on 2 October 2026. Test entries were created through the app; the shipped planner starts empty.

## Automated checks

- `npm test`: 7 model tests and 7 UI tests pass.
- `npm run build`: TypeScript and the production bundle pass.
- `npm run format:check`: source formatting passes.
- Dependency installation audit: zero reported vulnerabilities after upgrading the build and test tools.

The model tests cover saved task round trips, local calendar dates including daylight-saving and year boundaries, moving and ordering without duplicate tasks, one main outcome per day, no automatic rollover, and rejection of invalid or incompatible data.

The UI tests cover capture, completion/reopening across remounts, date/notes/outcome editing, deletion with Undo, failed writes and retry, preserving unreadable storage while locking planning, discard confirmation, restoring a backup while storage is unreadable, and invalid backup rejection without changing existing tasks.

## Browser checks

The running Vite app was checked in the Codex browser at desktop width 1440 px and mobile widths 390 px and 320 px.

| Acceptance criterion                      | Result | Evidence                                                                                                                                                                                              |
| ----------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capture, edit, complete, and reopen tasks | Pass   | Added an unscheduled task, edited its date/notes/main outcome, completed it, and reopened it.                                                                                                         |
| Saved tasks survive reload                | Pass   | Reloaded and confirmed the date, notes, main outcome, and completion state in rendered controls.                                                                                                      |
| Move and reorder without duplicates       | Pass   | Native pointer drag moved a task from Friday to Thursday. The detail panel's Up button reordered two Friday tasks. Model tests cover ordered identity preservation.                                   |
| Week navigation preserves work            | Pass   | Next week showed an empty plan; Today returned to the original tasks.                                                                                                                                 |
| Mobile planning                           | Pass   | Created a task from the unscheduled drawer, deleted and restored it, scheduled it for Saturday, enabled weekends, and selected Saturday to see it. No horizontal document overflow at 390 or 320 px.  |
| Keyboard operation                        | Pass   | Enter added tasks and opened details. Up reordered work. Tab reached the date input while staying in the native dialog. Escape closed task entry and details.                                         |
| Storage failure and corrupt data          | Pass   | UI tests force a quota error, verify retained in-memory work, and retry successfully. Invalid stored JSON remains intact with disabled planning until a valid backup is restored or reading succeeds. |
| Clear errors and recovery                 | Pass   | Failed backup import leaves existing work intact and announces a recovery message. Corrupt-data restore input remains enabled.                                                                        |

Browser console inspection found Vite and React development messages and no application errors. The initial load and reloads rendered successfully with no failed application request observed.

Screenshot evidence is saved locally in `.impeccable/review/desktop.jpg` and `.impeccable/review/mobile.jpg` (ignored by Git). Those images contain verification tasks, not seeded product data.

## Limits

Storage errors and backup import are proven by UI tests rather than injecting failures into the browser. Native file picker behavior is not automated. Cross-tab updates are supported, but simultaneous edits are last-write-wins and are not conflict-merged. Persistence is browser-local; there is no account or cloud sync.
