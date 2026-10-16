# Planner design

Ultrafocussed is an Operate surface. The work leads: dates, tasks, and goal checklists. No repeated view headings, motivational copy, statistics, or oversized empty states.

## Structure

The app header contains the identity, Month/Year/Goals tabs, backup controls, theme toggle, and help. The selected tab has a short underline. A separate, attached toolbar contains the period title, previous/next, Today, and the current view's primary action. Add goal belongs here, never in a detached content band. Only failed saves need a persistent status message.

On phones, navigation tabs occupy a second header row. Period controls stay grouped. Unscheduled becomes an explicit full-width toggle in the toolbar. Main views have no horizontal page scrolling.

## Views

Month has an Unscheduled rail on desktop and a Monday-to-Sunday calendar. Date cells have a compact plus control for task creation, visible keyboard focus, and readable task rows. Today has a filled date circle. Past dates have a distinct neutral fill in both themes, with editable tasks. The date boundary advances at local midnight and when the window regains focus. Spillover dates are quieter than the active month.

On mobile, select a date in the compact month grid to see its tasks below. Tasks render once. Unscheduled opens separately.

Year uses twelve aligned six-row calendars, four columns on wide screens, three at intermediate widths, two on tablets, and one on narrow phones. Month titles and dates open Month. Planned and completed task markers remain distinct.

Goals has up to four title-and-checklist sections for the year. Each section has a contained header with edit/remove controls, ruled task rows, and inline action capture. Rows show only checkbox and title. Open a task for scheduling, notes, or focus. Adding a goal opens a dialog and then focuses the new goal's action field, including after creating the fourth goal. Removing a goal confirms that tasks and dates will be kept.

## Components and interaction

PlannerHeader owns application navigation and utilities. PlannerToolbar owns period navigation and view actions. Modal provides native focus trapping, labelled headings, Escape handling, and focus restoration. Goal creation/rename and calendar task creation use this shared component.

Task details use a centered, scrollable native dialog with a sticky action footer. Title, next step, goal, date, main outcome, notes, progress notes, and history remain editable. Unsaved edits require an explicit Keep editing or Discard changes decision. Saving a changed date follows the task and returns focus to it.

Focus setup, countdown, and finish controls stay inside task details. Sessions survive reloads. Finish requires no written update. Completion, keyboard reordering and date moves, backup recovery, cross-tab updates, and Undo remain supported. No automatic rollover, scores, sounds, or streaks.

## Light and dark themes

The first visit follows the system preference. The header's sun/moon control switches themes and saves the explicit choice separately from planner data. Theme preference failures do not block planning. The initial theme is applied before mounting React.

Both themes use semantic tokens for text, muted text, surfaces, separators, controls, past dates, primary actions, header bands, errors, and keyboard focus. Filled actions use an explicit foreground token instead of assuming white text. Native inputs and date pickers inherit color-scheme. Secondary text retains at least 4.5:1 contrast, including past-date cells. Dark mode uses layered charcoal surfaces rather than inverting white header bands.

System sans typography, compact application chrome, 14 px body text, 13 px calendar tasks, and tabular date/timer numerals. Keyboard focus has a visible blue ring. Errors use warm red. Surfaces use restrained rounding; goal sections contain their own controls. No decorative imagery or animation.
