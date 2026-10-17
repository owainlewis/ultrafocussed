# War Map

Decision status: accepted through the user's request for Year, Month and a planner for 3–4 goals. Delivery status: implemented in [PR #3](https://github.com/owainlewis/ultrafocussed/pull/3), open for review. Automated behavior checks and independent code review pass; native visual verification remains blocked.

## Outcome and scope

Replace the weekly-only surface with a high-level Year, default Month, and Goals. Preserve the quiet neutral visual system, personal browser-local storage, tasks, notes, completion, active sessions and backup recovery. No external calendar sync, accounts, teams, priority scoring or nested goal hierarchies.

## Behavior

- Month shows every day, including weekends, aligned Monday to Sunday. Adjacent-month dates fill boundary weeks. Desktop shows tasks in date cells and Unscheduled in the left rail. Mobile shows a compact date grid with tasks for the selected date below it.
- Year shows twelve months with scheduled-action markers and counts. Month titles open the corresponding Month; date buttons select that date in Month.
- Goals are annual, with at most four per year. A goal has a title and action list. Empty years allow adding the first goal without requiring all four.
- Goal actions are ordinary tasks with an optional goal ID and planning date. Adding an action starts it unscheduled. Schedule opens task details; selecting a date places the same action in Month. Completion is shared everywhere.
- Rename preserves identity. Remove goal asks for confirmation and unlinks its actions while preserving their dates, notes, completion and session history.
- Goal-list keyboard ordering scopes to that goal across dates. Dragging is disabled in Goals because date-based drops would be ambiguous. Month retains dragging, date moves and keyboard alternatives.
- Task details can assign or clear a goal. Timers retain their 60-minute default and live/ended states.

## Technical design

`PlannerState` retains version 1 and its storage key, adding optional `goals: Goal[]`. `Goal` has ID, title (1–200 trimmed characters) and year (1–9999). `Task.goalId` is optional/null or references an existing goal. Decode rejects duplicates, dangling goal references, invalid fields and more than four goals per year. Old backups without goals load unchanged.

App coordinates shared state; usePlannerStorage handles persistence. WarMapViews receives values and callbacks. Views do not store separate task copies. Goal removal updates goals and task links in one state transition. Other-tab writes retain the existing last-write-wins policy and saved-data failure protections.

## Acceptance

| ID   | Done when                                                                              | Proof                                                            |
| ---- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| AC-1 | Default Month navigates correctly across month/year/leap boundaries                    | Model date tests and UI month navigation                         |
| AC-2 | Year has 12 months and drills into Month                                               | UI test                                                          |
| AC-3 | Each year supports up to 4 editable goals and action lists                             | UI cap/rename test and decoder tests                             |
| AC-4 | Scheduling/completing a goal action updates the same task in Month and survives reload | End-to-end DOM UI test                                           |
| AC-5 | Goal removal preserves actions and their state                                         | Model and UI tests                                               |
| AC-6 | Old data, backups, active timer and recovery flows remain valid                        | Existing model/UI suite plus goal round trips                    |
| AC-7 | Mobile shows each selected-day task once; goal ordering respects the displayed goal    | Responsive-hook and ordering UI tests                            |
| AC-8 | Desktop and mobile render without clipping and actions are reachable                   | Native browser check; blocked by saved browser-access preference |

## Open decisions

None for this version. Native visual proof remains unavailable until the saved browser permission block is removed.

## Delivery evidence

- `npm test`: 13 model and 37 UI tests pass, covering AC-1 through AC-7 and existing planner/timer/recovery behavior.
- TypeScript/production build, formatting, diff check and interface detector pass.
- Independent code review: Approve after fixing goal ordering and disabling ambiguous goal dragging.
- AC-8 remains unverified: the saved browser permission setting blocks native browser checks. No workaround was attempted.

## Preview freshness fix

The supplied screenshot still showed the previous task styling. Runtime diagnosis confirmed the Vite dev server served an older stylesheet than the file on disk. Restarting restored equality; polling file changes every 500 ms prevents missed external-editor writes. A temporary CSS comment was detected in the served stylesheet without restarting, then removed; the restored served stylesheet exactly matched the original file. This verifies asset freshness, not native browser layout.
