# Planner verification

Verified on 2 October 2026 after Claude's UX/UI redesign. Verification tasks were created through the app and removed afterward. The shipped planner starts empty.

## Automated checks

- `npm test`: 7 model tests and 17 UI tests pass.
- `npm run build`: TypeScript and the production bundle pass.
- `npm run format:check` and `git diff --check`: pass.
- The interface detector reports no findings.

Model tests cover storage round trips, local calendar dates and week boundaries, moving and ordering without duplicates, one main outcome per day, no automatic rollover, and invalid-data rejection.

UI tests cover direct capture, completion/reopening across remounts, date/notes/outcome editing, deletion with Undo, failed saves and retry, unreadable-data preservation and recovery, valid and invalid backup imports, dirty-edit confirmation, keyboard moving and focus, quick dates, earlier-work rescheduling, composer Escape focus, and raw saved-data export. Five focus regression tests also cover saving to another week, hidden weekends, Unscheduled, discarding edits, and preserving an earlier-task opener.

## Browser checks

The running Vite app was checked in the Codex browser at desktop 1440 x 900 and mobile widths 390 and 320 px.

| Redesign criterion                                                        | Result | Evidence                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board starts within 80 px of desktop top; no slogan or productivity score | Pass   | Browser measurement: board top 56 px at 1440 x 900. Current screenshots show only planning controls.                                                                                                                                                                                  |
| Readable typography                                                       | Pass   | Computed visible text sizes start at 12 px; task titles are 14 px on desktop and 15 px on mobile. Independent review checked contrast and presentation.                                                                                                                               |
| Direct unscheduled capture                                                | Pass   | Typed into the always-visible capture field and pressed Enter without opening a composer.                                                                                                                                                                                             |
| Day capture and keyboard exit                                             | Pass   | Enter added a task and kept entry open. Escape restored focus to that day's Add task button.                                                                                                                                                                                          |
| Keyboard moving and reordering                                            | Pass   | Alt+Up reordered tasks. Alt+Right moved Unscheduled to Today, then Saturday, revealing weekends and keeping task-title focus. Alt+Left crossed Monday to the preceding Sunday and followed the task across weeks on mobile.                                                           |
| Quick planning dates                                                      | Pass   | Used Today, Tomorrow, Next Monday, and Unscheduled from task details.                                                                                                                                                                                                                 |
| Earlier unfinished work                                                   | Pass   | Earlier tasks appeared at the top of the rail. Mobile Unscheduled showed the earlier count; its Today action moved the task without changing its identity.                                                                                                                            |
| Pointer dragging and ordering                                             | Pass   | Native pointer drag moved a task from Thursday to Wednesday. Model tests prove identity/order preservation; the insertion marker implementation was independently reviewed.                                                                                                           |
| Focus after saving a changed planning date                                | Pass   | On mobile, Next Monday changed the visible week and selected day with focus on the title. Tomorrow revealed a hidden Saturday and retained title focus. Unscheduled opened the drawer and retained title focus. The initial defect was reproduced, then rechecked after Claude's fix. |
| Unreadable data and recovery                                              | Pass   | UI tests prove locked planning and unchanged raw storage, enabled restore, successful recovery, and export of the raw stored value instead of an empty planner.                                                                                                                       |
| Existing data format and reload persistence                               | Pass   | Storage key and version are unchanged. Browser reload preserved task dates, notes, main outcome, and completion; completed work was reopened afterward.                                                                                                                               |
| Mobile fit                                                                | Pass   | Document width equalled viewport width at 390 and 320 px. At 320, weekends and an earlier-work indicator were present without horizontal overflow.                                                                                                                                    |
| Build, tests, formatting                                                  | Pass   | Commands above pass; independent reviewer reran tests and diff checks.                                                                                                                                                                                                                |

Console inspection found only Vite and React development messages, with no application errors. Initial loads and reloads rendered successfully.

Local screenshot evidence is saved in `.impeccable/review/claude-desktop.jpg` and `.impeccable/review/claude-mobile.jpg` (ignored by Git). They show labelled verification tasks, not seeded product data.

## Review

Claude Code performed the UX/UI review and implemented the redesign. A fresh independent agent reviewed the changed implementation and screenshots. Its date-save focus finding was fixed by Claude and checked again in tests and the browser. Final verdict: Approve; visual verdict: ship.

## Limits

Storage failures and backup import are proven by UI tests rather than injected browser failures. Native file picker behavior is not automated. Simultaneous cross-tab edits are last-write-wins without conflict merging. Persistence is browser-local with no account or cloud sync. Assistive-technology testing beyond keyboard and labelled-control checks is not included.

## Goals and daily task links (2026-10-04)

- Automated: 10 model tests and 19 component tests pass; production build and formatting checks pass.
- Goal capture/edit: component test covers outcome, reason, date, 90-day focus, completion, and reload.
- Daily planning: component test links a task, schedules it for today, reloads, renames the goal, and unlinks the task. Existing planner tests cover movement, completion, storage failure, backup, and keyboard flows.
- Compatibility: model tests verify version 1 migration, goal/task backup round-trip, retained links after task moves/completion, and rejection of invalid goals or dangling links.
- Real browser: desktop created a goal, linked and scheduled a task, and reloaded to verify persistence. Keyboard Enter expanded Goals. At 390 × 844, edited a goal and verified the task label changed. No warning/error console logs were captured. Screenshots were inspected for desktop and mobile layout.

## Week and month views (2026-10-04)

- Automated: 12 model tests and 24 component tests pass; production build and formatting checks pass.
- Month boundaries: model tests cover Monday-first grids for a Thursday start (35 days), a Monday-to-Sunday February (28), a Saturday start with 31 days (42), a leap February, and the March daylight-saving change. Month steps clamp 31 January to the end of February in normal and leap years and cross year ends.
- View switching: a component test operates the labelled toggle with the keyboard, checks both pressed states, shows all 35 October cells with weekends hidden in the week view, marks today, steps to September with the selected day kept, and switches back to Week on a selected Saturday, which reveals weekends and keeps that date selected.
- Shared state: component tests complete a task and capture a task in month cells, move a task with Next Monday and follow it, reorder and move tasks with Alt + arrows across the October/November boundary with focus kept, and confirm the week view shows the same single records.
- Goals: a component test checks the 90-day focus, open linked tasks in date order with Unscheduled last, opening and unlinking a task from the panel, and editing the focus.
- Mobile: a component test with the mobile media query checks the compact grid, the selected day's list below it, an Alt + Right move that follows the task, day capture, and the Goals panel.
- Real browser: desktop Month capture added a task, Alt + Right moved it to the next day, Week showed the same task, and Month completion updated that record. Mobile day selection showed the matching task list and opened its task entry. Next/previous month navigation was verified. Desktop and mobile screenshots were inspected. Console inspection found no warnings or errors.
- Final review: independent finish review returned Approve / ship with no findings.
- Limits: assistive-technology use beyond the existing keyboard and labelled-control checks, heavy task density, and intermediate tablet widths were not verified in the browser for this change.
