# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, and Vite. Implementation default recommended in conversation; no alternative stack was specified.

## Users

Solo users connecting annual goals to scheduled actions. Personal use is the v1 assumption accepted in the proposed design.

## Product Purpose

A personal War Map with Year, Month, and Goals views. Set up to four annual goals, list their actions, and schedule those actions in the month. Tasks have only a title and optional date. Completion and a separate focus action stay on the task row.

## Capabilities and Constraints

Year provides a twelve-month overview. Month is the default calendar, with all seven days visible. Goals groups actions under up to four goals per year. Actions share task identity across every view. Removing a goal preserves its tasks and dates. Browser-local persistence, unscheduled tasks, completion and reordering remain supported. Existing notes, progress notes, goal links, main outcomes and other legacy metadata are preserved in storage and backups; the task editor does not expose them. The calendar begins immediately below the toolbar; no planning or session panels sit above it.

The focus loop is a separate task-row action: choose 1 to 180 minutes, begin, stop or let it expire, and finish. It uses its own dialog. Closing the dialog keeps the active session running. Reloads preserve sessions without opening extra dialogs. Finishing records the time spent and preserves task completion and existing metadata. Completion is changed on the task row. No next-step, progress-note or completion fields appear in the focus dialog.

No accounts, cloud sync, team or social features. No timer sounds, notifications, scores, streaks, or hard targets. Saved data keeps the version 1 format and key, so older backups still load.

## Brand Commitments

Ultrafocussed. Minimalist layout with light and dark modes, neutral surfaces, clear contrast, and blue only for keyboard focus. Application navigation and view actions live in consistent attached toolbars. No green and no other decorative accent colour. No permanent navigation sidebar.

## Product Principles

Fast capture. Explicit choices about unfinished work. One task shared across every view. Focus starts where the task is. No productivity scores or artificial sample work.

## Accessibility & Inclusion

Keyboard alternatives to dragging, visible focus, labelled controls, focus that follows the focus loop (to Finish session after stopping, back to the task row after saving or finishing focus), and responsive mobile planning.
