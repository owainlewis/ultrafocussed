# Planner design

The planner is an Operate surface: a quiet ledger of one week. Everything that is not a date, a task, or a control has been removed. The review that led here is in [docs/claude-ux-review.md](docs/claude-ux-review.md). The focus loop and neutral palette review is in [docs/claude-focus-ui-review.md](docs/claude-focus-ui-review.md).

## Layout

- One slim top bar holds all global controls: wordmark, previous and next week, the visible date range as the page heading, Today, Weekends, save status, Export, Import, and Help.
- The calendar follows the toolbar directly. No weekly outcome editor or focus strip appears above it. Saved outcomes remain in backups.
- Focus controls appear only inside task details when the task’s timer action is selected. Closing task details hides the controls without stopping a running timer.
- Below them, the board fills the viewport. A gray rail on the left holds From earlier and Unscheduled. Day columns sit on white with fine rules and scroll on their own, so the week stays in view.
- Desktop shows five days. Weekends expand on request, and the toggle shows how many weekend tasks are hidden.
- Mobile (760 px and below) stacks the top bar into three short rows, adds a day strip, and shows one selected day. An Unscheduled button switches to the rail and shows the From earlier count. Focus stays inside task details on mobile too.

## Tasks

- Tasks are rows, not cards: an 18 px checkbox, a 14 px title (15 px on mobile), a one-line preview, and a timer button at the right. Hairlines separate rows.
- The preview shows the next step, or else the first line of notes. A small target icon marks a task linked to a weekly outcome.
- The timer button ("Focus on <task>") is on every open task. It is gray at rest and darkens on hover. Idle timer actions are hidden on completed tasks and while another session exists. The active task keeps a charcoal timer button with a live countdown. After stopping or expiring it becomes a neutral Done button. Both states open the task’s session controls and focus them. Narrow columns wrap these buttons below the title. Touch targets grow to 36 px on mobile.
- The main outcome has a light gray background, a 2 px charcoal rule on the left, and a "Main outcome" label.
- The task in the current session has a gray background, a charcoal rule, and an "In focus" label.
- Completed tasks stay in place, muted and struck through.
- The whole row is draggable. A charcoal line shows where a dragged task will land.
- Focus a task title and press Alt (Option) with an arrow key: Up and Down reorder, Left and Right move it one day. Right on an unscheduled task schedules it for today. The view follows the task and focus stays on it.

## Focus loop

1. **Set up.** The timer button opens task details with the task title, the linked outcome, a one-line Next step field (prefilled, optional), Minutes (default 60, whole numbers 1 to 180, Begin is disabled otherwise). Focus goes to Next step, so Enter begins at once. Cancel removes the setup controls and returns focus to the Task field, preserving unsaved edits.
2. **Run.** The strip collapses to one line: "Focusing on", title, next step, outcome, the remaining time, and Stop. Focus moves to the strip itself. The session is stored, so a reload resumes the same timer.
3. **Finish.** Stop, or the end of the time, shows Task complete, Next step, and Finish session. No written update is required. After Stop, focus goes to Finish session. If time runs out while the user works elsewhere, focus stays where it is. Next step and Task complete follow edits made in task details or on the board until the user changes them in the finish form. After finishing, the focus controls disappear, task details stay open, and focus returns to the Task field. Unsaved task edits remain intact. Optional Progress notes are edited in task details; previous session notes remain in history. New sessions without a note show "Focus session" in history.

Task details also offer Start focus in the footer. With unsaved edits it reads "Save and start focus" and saves them first.

## Capture and editing

- Unscheduled has an always-visible capture field. Type and press Enter.
- Each day has a quiet "Add task" row. It opens an inline field that stays open after Enter. Escape closes it and returns focus.
- Task details open in a native modal dialog styled as a right side panel. It offers the title, Next step, quick dates (Unscheduled, Today, Tomorrow, Next Monday), the date field, Main outcome, notes, optional Progress notes, progress history, Delete, Start focus, and Save. The footer sticks to the bottom of the panel, so actions stay in reach with long notes or history. Escape or a backdrop click asks before discarding edits. Saving a new date follows the task: the view moves to its week, reveals weekends, selects the day on mobile, or opens Unscheduled, and focus goes to the task. Closing without a date change returns focus to the control that opened the dialog. Cancelling or deleting never moves the view.

## Unfinished work

Nothing rolls forward automatically. Unfinished tasks from past days appear under From earlier at the top of the rail with a one-click Today action. They can also be opened or dragged.

## Feedback and failures

- Routine confirmations (task updates, focus started, progress saved) are announced to screen readers only. Toasts are shown for Undo, backup results, cross-tab updates, storage problems, and moves that leave the visible week or lose a main outcome.
- Storage failures show a banner that names the recovery action. When saved data cannot be read, planning and focus are locked, Export is disabled, and the banner offers Retry, Restore backup, and Download saved data (the raw stored value).
- A task in a session cannot be deleted until the session is finished.
- Empty states are plain: an empty day shows only "Add task"; an empty rail says "Nothing unscheduled."

## Visual system

- System sans type with restrained tracking and a 1.5 body line height. Body 14 px. Task titles use medium weight, 12 px vertical row padding, and clearer separation from note previews. The desktop toolbar is 64 px tall with 24 px horizontal padding. No text below 12 px. The timer uses tabular numerals.
- Neutral only. Ink `#1c1c1c`, muted text `#5c5c5c` (at least 5.9:1 on every surface it sits on), rules `#e6e6e6`, white columns, gray rail and focus strip `#f8f8f8`, light tint `#f7f7f7` for today and the main outcome.
- Charcoal `#2b2b2b` fills primary buttons, the Today tag, selected chips, completed checkboxes, and the selected mobile Unscheduled button. Emphasis without fill uses weight, a charcoal rule, or an underline.
- Keyboard focus is a 2 px blue ring (`#2563eb`). Blue is used for nothing else.
- The only other colour is the warm red of errors and the storage banner.
- No green anywhere: no tinted surfaces, text, controls, selection, drop targets, or focus states.
- No decorative animation, imagery, progress scores, or motivational copy.
