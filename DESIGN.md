# Planner design

The planner is an Operate surface: a quiet ledger of one week. Everything that is not a date, a task, or a control has been removed. The review that led here is in [docs/claude-ux-review.md](docs/claude-ux-review.md).

## Layout

- One slim top bar holds all global controls: wordmark, previous and next week, the visible date range as the page heading, Today, Weekends, save status, Export, Import, and Help.
- Below it, the board fills the viewport. A tinted rail on the left holds From earlier and Unscheduled. Day columns sit on white with fine rules and scroll on their own, so the week stays in view.
- Desktop shows five days. Weekends expand on request, and the toggle shows how many weekend tasks are hidden.
- Mobile (760 px and below) stacks the top bar into three short rows, adds a day strip, and shows one selected day. An Unscheduled button switches to the rail and shows the From earlier count.

## Tasks

- Tasks are rows, not cards: an 18 px checkbox, a 14 px title (15 px on mobile), and a one-line note preview. Hairlines separate rows.
- The main outcome has a soft green background, an accent rule on the left, and a "Main outcome" label.
- Completed tasks stay in place, muted and struck through.
- The whole row is draggable. An accent line shows where a dragged task will land.
- Focus a task title and press Alt (Option) with an arrow key: Up and Down reorder, Left and Right move it one day. Right on an unscheduled task schedules it for today. The view follows the task and focus stays on it.

## Capture and editing

- Unscheduled has an always-visible capture field. Type and press Enter.
- Each day has a quiet "Add task" row. It opens an inline field that stays open after Enter. Escape closes it and returns focus.
- Task details open in a native modal dialog styled as a right side panel. It offers quick dates (Unscheduled, Today, Tomorrow, Next Monday), the date field, Main outcome, notes, Up and Down, Delete, and Save. Escape or a backdrop click asks before discarding edits. Saving a new date follows the task: the view moves to its week, reveals weekends, selects the day on mobile, or opens Unscheduled, and focus goes to the task. Closing without a date change returns focus to the control that opened the dialog. Cancelling or deleting never moves the view.

## Unfinished work

Nothing rolls forward automatically. Unfinished tasks from past days appear under From earlier at the top of the rail with a one-click Today action. They can also be opened or dragged.

## Feedback and failures

- Routine confirmations are announced to screen readers only. Toasts are shown for Undo, backup results, cross-tab updates, storage problems, and moves that leave the visible week or lose a main outcome.
- Storage failures show a banner that names the recovery action. When saved data cannot be read, planning is locked, Export is disabled, and the banner offers Retry, Restore backup, and Download saved data (the raw stored value).
- Empty states are plain: an empty day shows only "Add task"; an empty rail says "Nothing unscheduled."

## Visual system

- System sans type. Body 14 px. No text below 12 px.
- Warm neutral canvas, white day columns, tinted rail, fine rules. Forest green (`#3c6650`) marks today, focus, the main outcome, and primary actions. Muted text (`#586259`) meets WCAG AA on every surface.
- No decorative animation, imagery, progress scores, or motivational copy.
