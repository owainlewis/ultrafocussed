# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, and Vite. Implementation default recommended in conversation; no alternative stack was specified.

## Users

Solo users planning work across several days. Personal use is the v1 assumption accepted in the proposed design.

## Product Purpose

A minimalist weekly planner with a focus loop. Capture tasks, assign a planning date, choose a main outcome per day, focus on a task for a chosen time, and keep optional progress notes on the task.

## Capabilities and Constraints

Only the planner is in scope. Browser-local persistence, unscheduled tasks, dated tasks, completion, notes, reordering, one main outcome per day, and saved legacy weekly outcomes. The calendar begins immediately below the toolbar; no planning or session panels sit above it.

The focus loop: a task with an optional concrete next step, then a timed session of 1 to 180 minutes, then finish the session with optional task completion. Progress notes are edited on the task, not requested after sessions. Sessions start inside task details, opened through a timer action on a task row or the task itself. The active session survives reloads, can be stopped early, and records only the time actually spent. Progress history stays on the task.

No accounts, cloud sync, team or social features. No timer sounds, notifications, scores, streaks, or hard targets. Saved data keeps the version 1 format and key, so older backups still load.

## Brand Commitments

Ultrafocussed. Minimalist layout, quiet neutral surfaces in ink, gray, and white, charcoal for primary controls and emphasis, blue only for keyboard focus. No green and no other decorative accent colour. No permanent navigation sidebar.

## Product Principles

Fast capture. Explicit choices about unfinished work. One task shared across every view. Focus starts where the task is. No productivity scores or artificial sample work.

## Accessibility & Inclusion

Keyboard alternatives to dragging, visible focus, labelled controls, focus that follows the focus loop (to Finish session after stopping, back to the task after saving), and responsive mobile planning.
