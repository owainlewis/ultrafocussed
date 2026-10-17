# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, and Vite. Implementation default recommended in conversation; no alternative stack was specified.

## Users

Solo users connecting annual goals to scheduled actions. Personal use is the v1 assumption accepted in the proposed design.

## Product Purpose

A personal War Map with Tasks, Calendar, Projects, and Goals views. Set up to four annual goals, list their actions, and schedule those actions in the month. Tasks have only a title and optional date. Completion and a separate focus action stay on the task row.

## Capabilities and Constraints

Plan is the default screen. Tasks is the brain-dump list. Quick capture creates unscheduled tasks. Scheduled and past tasks remain in the same list; completed tasks are hidden by default and accessible through Show completed; each row offers an optional date and a separate focus action. Assigning a date puts the existing task on the calendar without leaving Tasks. Year provides a twelve-month overview. Month is a full-width calendar with all seven days visible and no separate Unscheduled rail. Goals groups actions under up to four goals per year. Actions share task identity across every view. Removing a goal preserves its tasks and dates. Browser-local persistence, unscheduled tasks, completion and reordering remain supported. Existing notes, progress notes, goal links, main outcomes and other legacy metadata are preserved in storage and backups; the task editor exposes goal and project links under Organise while keeping legacy notes in storage. The calendar begins immediately below the toolbar; no planning or session panels sit above it.

The focus loop is a separate task-row action: choose 1 to 180 minutes, begin, stop or let it expire, and finish. It uses its own dialog. Closing the dialog keeps the active session running. Reloads preserve sessions without opening extra dialogs. Finishing records the time spent and preserves task completion and existing metadata. Completion is changed on the task row. Plan hour sessions end with a workform describing the work done; task completion remains separate.

No accounts, cloud sync, team or social features. The daily goal is four deep-work hours. No timer sounds, notifications, leaderboards or streaks. Saved data keeps the version 1 format and key, so older backups still load.

## Brand Commitments

Ultrafocussed. Minimalist layout with light and dark modes, neutral surfaces, clear contrast, and blue only for keyboard focus. Application navigation lives in a collapsible left sidebar; view actions live in attached page toolbars. No green and no other decorative accent colour. Phones use a compact navigation icon rail.

## Product Principles

Fast capture. Explicit choices about unfinished work. One task shared across every view. Focus starts where the task is. No productivity scores or artificial sample work.

## Accessibility & Inclusion

Keyboard alternatives to dragging, visible focus, labelled controls, focus that follows the focus loop (to Finish session after stopping, back to the task row after saving or finishing focus), and responsive mobile planning.

Calendar has one navigation tab with a Month/Year switch in its toolbar. It remembers the scale when switching tabs. Projects uses the same title-and-checklist layout as Goals, without a year or count limit. Projects have an independent Active/Completed state; changing it keeps task completion unchanged. Tasks can link to both a project and a goal under Organise. Removing either group keeps the tasks, dates, notes and other links.

Weekly tracks recurring commitments with one checkbox per required completion. Tick several in one sitting; each tick automatically records today's date on a shared, unscheduled task. Untick to reopen that completion. Previous weeks retain their targets and records and are read-only for completion ticks. Existing batch records remain available, including notes and dates.

Weekly uses the shared Task model. Completion slots keep checkbox positions stable when reopening an item. Removing a routine retains its tasks and other weeks.

Existing tasks can link to a routine under Organise. Completing a linked, dated task counts toward that day in Weekly without creating a second task.

Plan opens by default with four one-hour blocks and a fixed four-hour daily goal. Blocks reference existing tasks and have no clock times; use Calendar for scheduling. The same task can fill several blocks. Quick capture assigns a new shared task to the first empty block or adds an hour when all are assigned. Previous and next day controls show separate saved plans and earned hours. Additional completed hours can exceed the goal without moving it. Legacy saved clock times remain readable but are not shown or required.

Start hour begins a fixed 60-minute session on today's plan. Only one session can run; Resume focus reopens it after closing the dialog or reloading. At the end, a required workform asks what you worked on. Draft workforms persist with the active session. Submitting saves the text in the existing task's session history. A block counts once only after a full 60 minutes and a submitted workform. Stopped sessions retain their actual time and workform but do not count as completed hours. Task completion stays independent. Completed blocks retain their task assignment and visible workforms. The daily count shows earned hours against a fixed four-hour goal. Additional blocks can exceed the goal without changing it.

Plan uses one compact sheet of hour rows and a four-segment progress display. A full submitted hour earns one segment; reaching four shows Daily goal reached. Task labels remain accessible without repeating visible field headings. The next assigned hour has the primary Start action. Quick capture creates an unscheduled shared task and assigns it to the first empty block, or adds an hour when the existing blocks are all assigned. Previous-day navigation shows that day’s earned hours.

Dialogs share a stable top position and scroll within the viewport when expanded. Focus-panel state classes are separate from form-layout classes, so workforms stack at full width. Input sizing, wrapping action footers and nested unsaved-change prompts work on phones. Keyboard focus returns to Add after checklist removal, to Undo after task deletion, and to the restored task after Undo. Undo clears group links if the group was removed in the meantime, preventing unreadable saved state.

Each Plan hour accepts a saved free-text intention with an optional task link. Starting an unlinked intention creates a shared task. The timer and submitted workform retain the intention for that hour.
