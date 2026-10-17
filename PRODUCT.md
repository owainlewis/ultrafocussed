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

Tasks is the default brain-dump list. Quick capture creates unscheduled tasks. Scheduled and past tasks remain in the same list; completed tasks are hidden by default and accessible through Show completed; each row offers an optional date and a separate focus action. Assigning a date puts the existing task on the calendar without leaving Tasks. Year provides a twelve-month overview. Month is a full-width calendar with all seven days visible and no separate Unscheduled rail. Goals groups actions under up to four goals per year. Actions share task identity across every view. Removing a goal preserves its tasks and dates. Browser-local persistence, unscheduled tasks, completion and reordering remain supported. Existing notes, progress notes, goal links, main outcomes and other legacy metadata are preserved in storage and backups; the task editor exposes goal and project links under Organise while keeping legacy notes in storage. The calendar begins immediately below the toolbar; no planning or session panels sit above it.

The focus loop is a separate task-row action: choose 1 to 180 minutes, begin, stop or let it expire, and finish. It uses its own dialog. Closing the dialog keeps the active session running. Reloads preserve sessions without opening extra dialogs. Finishing records the time spent and preserves task completion and existing metadata. Completion is changed on the task row. No next-step, progress-note or completion fields appear in the focus dialog.

No accounts, cloud sync, team or social features. No timer sounds, notifications, scores, streaks, or hard targets. Saved data keeps the version 1 format and key, so older backups still load.

## Brand Commitments

Ultrafocussed. Minimalist layout with light and dark modes, neutral surfaces, clear contrast, and blue only for keyboard focus. Application navigation lives in a collapsible left sidebar; view actions live in attached page toolbars. No green and no other decorative accent colour. Phones use a compact navigation icon rail.

## Product Principles

Fast capture. Explicit choices about unfinished work. One task shared across every view. Focus starts where the task is. No productivity scores or artificial sample work.

## Accessibility & Inclusion

Keyboard alternatives to dragging, visible focus, labelled controls, focus that follows the focus loop (to Finish session after stopping, back to the task row after saving or finishing focus), and responsive mobile planning.

Calendar has one navigation tab with a Month/Year switch in its toolbar. It remembers the scale when switching tabs. Projects uses the same title-and-checklist layout as Goals, without a year or count limit. Projects have an independent Active/Completed state; changing it keeps task completion unchanged. Tasks can link to both a project and a goal under Organise. Removing either group keeps the tasks, dates, notes and other links.
