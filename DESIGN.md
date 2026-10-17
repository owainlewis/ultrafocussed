# Planner design

Ultrafocussed is an Operate surface. The work leads: dates, tasks, and goal checklists. No repeated view headings, motivational copy, statistics, or oversized empty states.

## Structure

A left sidebar contains the identity, Tasks/Calendar/Projects/Goals navigation with Lucide icons, and grouped backup, theme and help controls at the bottom. The selected view has a neutral filled background. A labelled collapse control switches between full labels and an icon rail; the choice is saved separately from planner data. Icon buttons retain accessible names and native tooltips.

On phones the sidebar is a compact icon rail. The content column stays flexible and the calendar toolbar wraps its period controls. Main views have no horizontal page scrolling. The attached page toolbar owns period navigation and the view's primary action. Only failed saves need a persistent status message.

## Views

Tasks is the default screen: one contained list with quick capture above the rows. Capture creates a task without a date. All existing tasks remain in storage, including dated, past and completed tasks. Tasks hides completed rows by default; a single Show completed checkbox reveals them for reopening or editing. The choice lasts for the current session and resets to hidden on reload. Completing a hidden row moves keyboard focus to the next open task or capture. Keyboard reordering uses only visible rows. Other views keep their existing completion display. Each row shows completion, title, Add date or the scheduled date, and a separate focus action. Date editing uses the existing two-field modal. Scheduling, clearing dates and finishing focus keep the list in place. No counters, filters, sidebar, repeated visible heading or detached action band. The main heading is available to screen readers. Keyboard Up/Down reorders the complete list without changing dates; dragging remains limited to the calendar.

Month is a full-width Monday-to-Sunday calendar with no Unscheduled rail or From earlier section. Date cells have a compact plus control for task creation, visible keyboard focus, and readable task rows. Today has a filled date circle. Past dates have a distinct neutral fill in both themes, with editable tasks. The date boundary advances at local midnight and when the window regains focus. Spillover dates are quieter than the active month. On mobile, select a date in the compact month grid to see its tasks below. Tasks render once. Clearing a calendar task’s date opens Tasks.

Year uses twelve aligned six-row calendars, four columns on wide screens, three at intermediate widths, two on tablets, and one on narrow phones. Month titles and dates open Month. Planned and completed task markers remain distinct.

Goals has up to four title-and-checklist sections for the year. Each section has a contained header with edit/remove controls, ruled task rows, and inline action capture. Rows show a checkbox, title, and separate timer action. Open a task to edit its title or date. Adding a goal opens a dialog and then focuses the new goal's action field, including after creating the fourth goal. Removing a goal confirms that tasks and dates will be kept.

## Components and interaction

PlannerSidebar owns application navigation and utilities. PlannerToolbar owns period navigation and view actions. Modal provides native focus trapping, labelled headings, Escape handling, and focus restoration. Goal creation/rename and calendar task creation use this shared component.

Task editing uses the shared Modal and contains a title and optional date, plus a collapsed Organise section for project and goal links, with Clear date when scheduled. Delete and Save share a footer. Saving patches editable fields only; existing notes, progress notes, goal links, main outcomes and session history remain in saved data and backups. Unsaved edits require an explicit Keep editing or Discard changes decision. Saving a changed date returns focus to the task. Tasks keeps its list in place; calendar edits follow the new date or open Tasks when clearing it. Task rows omit old note previews and main-outcome labels.

Focus is a separate timer action on every eligible task row, including Goals. It opens its own Modal with only Minutes and Begin. A running timer offers Stop, and an ended timer offers Finish session. Closing the modal does not stop the session; the task row reopens it. Reloads never open a focus dialog automatically. Completion stays on the row and is preserved when finishing. No next-step or notes fields appear in focus. Keyboard moves, backup recovery, cross-tab updates and Undo remain supported. No automatic rollover, scores, sounds or streaks.

## Light and dark themes

The first visit follows the system preference. The sidebar's sun/moon control switches themes and saves the explicit choice separately from planner data. Theme preference failures do not block planning. The initial theme is applied before mounting React.

Both themes use semantic tokens for text, muted text, surfaces, separators, controls, past dates, primary actions, header bands, errors, and keyboard focus. Filled actions use an explicit foreground token instead of assuming white text. Native inputs and date pickers inherit color-scheme. Secondary text retains at least 4.5:1 contrast, including past-date cells. Dark mode uses layered charcoal surfaces rather than inverting white header bands.

System sans typography, compact application chrome, 14 px body text, 13 px calendar tasks, and tabular date/timer numerals. Keyboard focus has a visible blue ring. Errors use warm red. Surfaces use restrained rounding; goal sections contain their own controls. No decorative imagery or animation.

Calendar has one navigation tab with a Month/Year switch in its toolbar. It remembers the scale when switching tabs. Projects uses the same title-and-checklist layout as Goals, without a year or count limit. Projects have an independent Active/Completed state; changing it keeps task completion unchanged. Tasks can link to both a project and a goal under Organise. Removing either group keeps the tasks, dates, notes and other links.
