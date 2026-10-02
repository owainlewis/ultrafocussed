# UX/UI review and redesign direction

Reviewed on 2 October 2026 from the source, tests, and the screenshots in `.impeccable/review/` (desktop and mobile with test tasks, preview with the empty shipped UI).

## What works

- The model is sound: one task list, stable ids, local dates, one main outcome per day, no automatic rollover.
- Failure handling is careful: unreadable data is never overwritten, failed writes keep work in memory, restore stays reachable.
- Native dialogs, labelled controls, and visible focus are a good base.

## Material weaknesses

1. **Chrome before work.** On a 1000 px tall desktop the board starts at about 285 px. An 88 px header and a slogan block ("Your week, with intention.") push the planner down. On mobile the selected day starts near the middle of the screen.
2. **Filler text.** "Get it out of your head", "Room to make progress" (repeated in every column), "Less on your list. More on your mind.", and "Drag to plan. Click a task to make it yours." add reading load and no information.
3. **Text too small.** Task titles are 12 px, notes 10 px, counts and labels 9 to 11 px, often muted on tinted surfaces. Reading a week of tasks is tiring.
4. **A score in the header.** "0 of 3 done" with a progress bar conflicts with the "no productivity scores" principle.
5. **Capture takes two steps everywhere.** Unscheduled, the main capture place, needs a click on "Add task" before typing.
6. **Cards waste narrow columns.** Bordered cards with 13 px padding in 140 to 220 px columns cut title width. Every empty day also says "0 tasks".
7. **Hidden or misleading affordances.** The "more" button is invisible until hover and duplicates the title. The drag handle is invisible and sits in a corner with no function of its own. Drops have no insertion marker, so where a task lands is a guess.
8. **Keyboard moving is buried.** The only alternative to dragging is opening the dialog and editing a date input or pressing Up and Down. Touch users (no HTML drag on most phones) have the same problem.
9. **Unfinished work is hard to act on.** "Needs a decision" lists earlier tasks at the bottom of the rail, below filler, with only an "open" action. On mobile it is hidden inside the Unscheduled drawer.
10. **Week label is vague.** "September – October 2026" does not say which days are shown.
11. **Export during a read failure is wrong.** When saved data cannot be read, "Export backup" downloads the empty in-memory planner, which looks like a backup but is not.
12. **Focus after dialogs.** Closing task details unmounts the dialog without returning focus to the task, so keyboard users land at the top of the page.

## Direction: a quiet ledger

Opinion [high]: the planner should look like a well-set paper week, not a dashboard. Remove everything that is not a date, a task, or a control. Spend the space on readable task text.
This changes if: user research shows the slogan and progress line help people return to the app. Nothing in the brief suggests that.

- One slim top bar holds everything global: wordmark, week range, previous/next/Today, Weekends, save status, Export, Import, Help. The week range is the page heading (`h1`).
- The board fills the remaining viewport height. Day columns scroll on their own so the week stays in view.
- Tasks are rows, not cards: a checkbox, a 14 px title, and a one-line note preview. Hairline rules, no boxes. The main outcome gets an accent rule and a "Main outcome" label.
- Unscheduled has an always-visible capture field at the top. Days keep a quiet "Add task" row that opens an inline field.
- Earlier unfinished work becomes "From earlier" at the top of the rail with a one-click "Move to today" action, plus open and drag.
- Keyboard moving on the task itself: Alt+Up/Down reorders, Alt+Left/Right moves a day back or forward. The view follows the task and focus stays on it.
- Task details gain quick dates (Unscheduled, Today, Tomorrow, Next Monday) next to the date field.
- Drag shows an insertion line where the task will land.
- Routine confirmations ("Task updated.") are announced to screen readers but not shown as toasts. Visible toasts are kept for Undo, errors, and backup results.
- Empty states are honest and short: an empty day shows only its "Add task" row; empty Unscheduled says "Nothing unscheduled."
- Mobile: compact bar, day strip, and an Unscheduled tab that also shows the "From earlier" count, so unfinished work is visible on phones.

Opinion [medium]: keep the warm neutral palette and forest accent. The problem was hierarchy and size, not colour.
This changes if: contrast checks fail for the muted text; it has been darkened to meet WCAG AA on every surface.

## Acceptance criteria

1. Desktop at 1440 x 900: the board starts within 80 px of the top, and no slogan, filler copy, or done/total score is shown.
2. Task titles render at 14 px or larger; no text is smaller than 12 px. Muted text meets WCAG AA (4.5:1) on its background.
3. Typing into the Unscheduled field and pressing Enter adds a task with no prior click.
4. A day's "Add task" opens an inline field; Enter adds and keeps the field open; Escape closes it and returns focus to "Add task".
5. Focusing a task title and pressing Alt+Up/Down reorders it; Alt+Left/Right moves it one day, following the task to its week, weekend, or mobile day. Focus stays on the task.
6. Task details offer Unscheduled, Today, Tomorrow, and Next Monday shortcuts in addition to the date field.
7. Unfinished tasks from earlier days appear first in the rail with "Move to today", and the mobile Unscheduled tab shows their count.
8. Dragging over a task shows an insertion line; dropping preserves identity with no duplicates.
9. Closing task details returns focus to that task's title, even if it moved columns. Escape and backdrop click still confirm before discarding edits.
10. When saved data cannot be read, planning is locked, the stored value is untouched, Retry and Restore backup work, and the export action downloads the raw stored data instead of an empty planner.
11. The localStorage key `ultrafocussed.planner.v1` and version 1 format are unchanged. Existing saved data loads as before.
12. No horizontal document overflow at 390 px and 320 px.
13. `npm test`, `npm run build`, and `npm run format:check` pass.
