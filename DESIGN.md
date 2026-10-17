# Planner design

Ultrafocussed is an Operate surface. The work leads: dates, tasks, and goal checklists. No repeated view headings, motivational copy, unrelated statistics, or oversized empty states.

## Structure

A left sidebar contains the identity, Plan/Tasks/Weekly/Calendar/Projects/Goals navigation with Lucide icons, and grouped backup, theme and help controls at the bottom. The selected view has a neutral filled background. An icon collapse control switches between full labels and an icon rail; the choice is saved separately from planner data. Icon buttons retain accessible names and native tooltips.

On phones the sidebar is a compact icon rail. The content column stays flexible and the calendar toolbar wraps its period controls. Main views have no horizontal page scrolling. The attached page toolbar owns period navigation and the view's primary action. Only failed saves need a persistent status message.

## Views

Tasks is the capture screen: one contained list with quick capture above the rows. Capture creates a task without a date. All existing tasks remain in storage, including dated, past and completed tasks. Tasks hides completed rows by default; a single Show completed checkbox reveals them for reopening or editing. The choice lasts for the current session and resets to hidden on reload. Completing a hidden row moves keyboard focus to the next open task or capture. Keyboard reordering uses only visible rows. Other views keep their existing completion display. Each row shows completion, title, Add date or the scheduled date, and a separate focus action. Date editing uses the existing two-field modal. Scheduling, clearing dates and finishing focus keep the list in place. No counters, filters, sidebar, repeated visible heading or detached action band. The main heading is available to screen readers. Keyboard Up/Down reorders the complete list without changing dates; dragging remains limited to the calendar.

Month is a full-width Monday-to-Sunday calendar with no Unscheduled rail or From earlier section. Date cells have a compact plus control for task creation, visible keyboard focus, and readable task rows. Today has a filled date circle. Past dates have a distinct neutral fill in both themes, with editable tasks. The date boundary advances at local midnight and when the window regains focus. Spillover dates are quieter than the active month. On mobile, select a date in the compact month grid to see its tasks below. Tasks render once. Clearing a calendar task’s date opens Tasks.

Year uses twelve aligned six-row calendars, four columns on wide screens, three at intermediate widths, two on tablets, and one on narrow phones. Month titles and dates open Month. Planned and completed task markers remain distinct.

Goals has up to four title-and-checklist sections for the year. Each section has a contained header with edit/remove controls, ruled task rows, and inline action capture. Rows show a checkbox, title, and separate timer action. Open a task to edit its title or date. Adding a goal opens a dialog and then focuses the new goal's action field, including after creating the fourth goal. Removing a goal confirms that tasks and dates will be kept.

## Components and interaction

PlannerSidebar owns application navigation and utilities. PlannerToolbar owns period navigation and view actions. Modal provides native focus trapping, labelled headings, Escape handling, and focus restoration. Goal creation/rename and calendar task creation use this shared component.

Task editing uses the shared Modal and contains a title and optional date, plus a collapsed Organise section for project and goal links, with Clear date when scheduled. Delete and Save share a footer. Saving patches editable fields only; existing notes, progress notes, goal links, main outcomes and session history remain in saved data and backups. Unsaved edits require an explicit Keep editing or Discard changes decision. Saving a changed date returns focus to the task. Tasks keeps its list in place; calendar edits follow the new date or open Tasks when clearing it. Task rows omit old note previews and main-outcome labels.

Focus is a separate timer action on every eligible task row, including Goals. It opens its own Modal with only Minutes and Begin. A running timer offers Stop, and an ended timer offers Finish session. Closing the modal does not stop the session; the task row reopens it. Reloads never open a focus dialog automatically. Completion stays on the row and is preserved when finishing. The task-row timer keeps its existing simple setup; planned hour blocks require a workform when finishing. Keyboard moves, backup recovery, cross-tab updates and Undo remain supported. No automatic rollover, scores, sounds or streaks.

## Light and dark themes

The first visit follows the system preference. The sidebar's sun/moon control switches themes and saves the explicit choice separately from planner data. Theme preference failures do not block planning. The initial theme is applied before mounting React.

Both themes use semantic tokens for text, muted text, surfaces, separators, controls, past dates, primary actions, header bands, errors, and keyboard focus. Filled actions use an explicit foreground token instead of assuming white text. Native inputs and date pickers inherit color-scheme. Secondary text retains at least 4.5:1 contrast, including past-date cells. Dark mode uses layered charcoal surfaces rather than inverting white header bands.

System sans typography, compact application chrome, 14 px body text, 13 px calendar tasks, and tabular date/timer numerals. Keyboard focus has a visible blue ring. Errors use warm red. Surfaces use restrained rounding; goal sections contain their own controls. No decorative imagery or animation.

Calendar has one navigation tab with a Month/Year switch in its toolbar. It remembers the scale when switching tabs. Projects uses the same title-and-checklist layout as Goals, without a year or count limit. Projects have an independent Active/Completed state; changing it keeps task completion unchanged. Tasks can link to both a project and a goal under Organise. Removing either group keeps the tasks, dates, notes and other links.

Weekly tracks recurring commitments with one checkbox per required completion. Tick several in one sitting; each tick automatically records today's date on a shared, unscheduled task. Untick to reopen that completion. Previous weeks retain their targets and records and are read-only for completion ticks. Existing batch records remain available, including notes and dates.

Weekly uses the shared Task model. Completion slots keep checkbox positions stable when reopening an item. Removing a routine retains its tasks and other weeks.

Existing tasks can link to a routine under Organise. Completing a linked, dated task counts toward that day in Weekly without creating a second task.

Plan opens by default with four one-hour blocks and a fixed four-hour daily goal. Blocks reference existing tasks and have no clock times; use Calendar for scheduling. The same task can fill several blocks. Quick capture assigns a new shared task to the first empty block or adds an hour when all are assigned. Previous and next day controls show separate saved plans and earned hours. Additional completed hours can exceed the goal without moving it. Legacy saved clock times remain readable but are not shown or required.

Start hour begins a fixed 60-minute session on today's plan. Only one session can run; Resume focus reopens it after closing the dialog or reloading. At the end, a required workform asks what you worked on. Draft workforms persist with the active session. Submitting saves the text in the existing task's session history. A block counts once only after a full 60 minutes and a submitted workform. Stopped sessions retain their actual time and workform but do not count as completed hours. Task completion stays independent. Completed blocks retain their task assignment and visible workforms. The daily count shows earned hours against a fixed four-hour goal. Additional blocks can exceed the goal without changing it.

Plan uses one compact sheet of hour rows and a four-segment progress display. A full submitted hour earns one segment; reaching four shows Daily goal reached. Task labels remain accessible without repeating visible field headings. The next assigned hour has the primary Start action. Quick capture creates an unscheduled shared task and assigns it to the first empty block, or adds an hour when the existing blocks are all assigned. Previous-day navigation shows that day’s earned hours.

Dialogs share a stable top position and scroll within the viewport when expanded. Focus-panel state classes are separate from form-layout classes, so workforms stack at full width. Input sizing, wrapping action footers and nested unsaved-change prompts work on phones. Keyboard focus returns to Add after checklist removal, to Undo after task deletion, and to the restored task after Undo. Undo clears group links if the group was removed in the meantime, preventing unreadable saved state.

Each Plan hour accepts a saved free-text intention with an optional task link. Starting an unlinked intention creates a shared task. The timer and submitted workform retain the intention for that hour.

Plan offers Mark done for an hour worked without the timer. Submit a short workform to record the hour; it turns green and earns one green progress segment. Four hours fill the goal bar. View workform opens saved reflections in a modal, keeping the plan free of expanding sections. Recording an hour does not complete its linked task.

Each Plan hour has one editable workform. Stopped sessions carry notes and recorded minutes forward; resumed timers show the remaining time. Existing workforms for the same hour are consolidated on load, retaining their text. When a workform already exists, Mark done completes the hour immediately without reopening the form. View workform edits the reflection without adding another hour.
