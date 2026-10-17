# Architecture

UltraFocussed is a static React/TypeScript app. Dashboard, Plan, Tasks, Calendar, Projects, Goals and Weekly operate on one browser-local `PlannerState`. There is no backend or account boundary.

## Responsibilities

| Source                                                 | Responsibility                                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `App.tsx`                                              | Coordinates views, shared mutations, keyboard moves, imports/exports and focus restoration.         |
| `usePlannerStorage.ts`                                 | Initial decode, persistence, cross-tab updates and retry/restore protections.                       |
| `model.ts`                                             | Persisted types, validation/migration, dates, task operations, hour scoring and routine allocation. |
| `DailyPlan.tsx`, `Dashboard.tsx`, `WeeklyView.tsx`     | Planning, the shared weekly score and routine completion presentation.                              |
| `TaskEditor.tsx`, `FocusPanel.tsx`, `Help.tsx`         | Focused editor, timer and help components.                                                          |
| `WarMapViews.tsx`, `ProjectsView.tsx`, `Checklist.tsx` | Calendar and shared project/goal checklist presentation.                                            |
| `Modal.tsx`                                            | Native dialog focus trapping, Escape handling and opener restoration.                               |
| `useCurrentPeriod.ts`, `useToday.ts`                   | Local date rollover, retaining intentional historical navigation.                                   |
| `AppErrorBoundary.tsx`                                 | Recoverable render failure with raw saved-data download.                                            |
| `styles.css`, `plan.css`                               | Shared theme/layout rules and one canonical Plan stylesheet.                                        |

## Invariants

1. Tasks retain one identity across views. Dates, completion, notes, group links and sessions belong to the shared task. Plan can create its task automatically when work starts or is recorded.
2. Each Plan hour has one workform, keyed by plan date and block ID. Stopped/resumed minutes accumulate up to 60. Each completed hour earns one point in the daily and weekly score. Task completion remains independent.
3. Dashboard and Plan use the same model scoring rules. Partial or blank workforms do not earn an hour. Extra hours do not increase the four-hour goal.
4. Weekly targets create no scheduled calendar tasks. Ticks use shared completed tasks with `completedOn`, quantity and stable slot metadata. Legacy batch records remain readable. The UI renders only the target's required checkboxes; over-target records remain in history.
5. Dates are local calendar keys. Weeks run Monday–Sunday. Session timestamps are elapsed instants; the saved plan date determines the hour's attribution. Current views follow rollover, while historical browsing stays selected.
6. At most four goals belong to a year. Group removal unlinks tasks without deleting their notes, dates or history.
7. Storage remains version 1 under `ultrafocussed.planner.v1`. Validation rejects malformed imports before replacement. Migration consolidates legacy workforms without dropping their text or active draft.

## Persistence

React state is authoritative during a session. A successful mutation is written as a complete JSON value to localStorage. A read failure prevents writes, retaining the original stored value. A write failure keeps the in-memory planner and ignores incoming storage events until recovery, so unsaved local work is not replaced. Restore is explicit and confirmed. Cross-tab writes are last-write-wins, without conflict merging.

All backup/recovery downloads use the same small download helper. The render error boundary reads and exports the stored value directly, independent of app state. It does not attempt an automatic reset.

## Verification

`npm run verify` runs source/test type checks, model and UI regressions, formatting and a production bundle. The regression suites exercise scoring, legacy backups, malformed data, quota/read failures, cross-tab recovery, date rollover, task identity and keyboard focus. See `docs/production-audit.md` for the release audit and `docs/deployment.md` for hosting requirements.
