# Focus loop UI review

Reviewed on 12 October 2026 from the source, tests, PRODUCT.md, DESIGN.md, and `.impeccable/review/focus-desktop.png` (desktop, running session). Claude made these changes at the user's request. The user asked for a quieter interface with no green.

## Findings

1. **Focus was hidden behind task details.** Starting a session took four steps across two surfaces: open the task, press Start focus inside the form, set the minutes in a panel above the board, then Begin. Nothing on the board said focus existed.
2. **Start focus was disabled by unsaved edits.** Editing the next step in task details and then pressing Start focus did nothing until the user saved and reopened the task.
3. **The focus panel was heavy.** The running panel was about 170 px tall on a green surface, with a 20 px heading and a 32 px clock. On a 720 px tall window it took a quarter of the board's height to show one line of state.
4. **Keyboard focus was awkward.** On mount, focus jumped to the task heading and drew a large ring around it (visible in the screenshot). After Begin, the button unmounted and focus fell to the page body. After Save progress, focus also fell to the body. When a timer ran out on its own, focus moved into the progress field even if the user was typing somewhere else.
5. **No sign of the session on the board.** The task in focus looked the same as any other row.
6. **Short windows.** The review form had no height limit. With a long title and next step it could push the board almost off screen, and nothing scrolled the panel itself.
7. **Green everywhere.** Forest green marked today, the main outcome, primary buttons, focus rings, chips, checkboxes, caret, selection, drop targets, and hover text. The canvas, rail, rules, muted text, toasts, and backdrop were green-tinted grays. The focus panel used its own hard-coded green (`#edf3ee`, `#cbd7ce`).
8. **Outcome links were invisible.** A task linked to the weekly outcome looked the same as any other task, and linking needed task details.

## Changes

### Flow

- Every open task row has a timer button ("Focus on <task>"). It opens a compact focus strip above the board. No dialog is needed.
- Setup sits on one line: Next step (optional, prefilled), Minutes (whole numbers 1 to 180; Begin is disabled with a message otherwise), an optional "Link to <outcome>" checkbox when the viewed week has an outcome and the task has none, Begin session, and Cancel. Enter in Next step begins at once.
- Running collapses to one line: label, title, next step, linked outcome, the remaining time, and Stop. Long text is clamped to two lines, with the full text in a tooltip.
- Review keeps "What moved forward?", Task complete, Next step, and Save progress in one wrapped row on desktop.
- The task in the session shows an "In focus" label and a charcoal rule. Other timer buttons hide while a session exists, because only one session can run.
- Task details keep Start focus, now in a sticky footer. With unsaved edits it reads "Save and start focus" and saves first.
- Rows linked to a weekly outcome show a small target icon in their preview line.

### Keyboard focus

- Setup: focus goes to Next step.
- Begin: focus goes to the focus strip (a labelled region), not the body.
- Stop: focus goes to "What moved forward?".
- Timer ends on its own: focus moves to the progress field only if it was on the strip or nowhere. It is never taken from other work.
- Save progress: the strip closes, the view follows the task (week, weekend, mobile day, or Unscheduled), and focus returns to the task title.
- Cancel: focus returns to the task title.

### Layout

- On desktop, the focus strip is capped at 50% of the window height (60% below 640 px) and scrolls on its own. On mobile it uses the page flow without a height cap.
- The weekly outcome line is 44 px with a quiet label. Escape discards a draft.
- The task details footer sticks to the bottom of the panel, so Delete, Start focus, and Save stay reachable with long notes or history.
- On mobile, a running strip sticks to the top of the screen, and timer buttons grow to 36 px.

### Visual system

- All green is gone. Ink `#1c1c1c`, muted `#5c5c5c`, rules `#e2e2e2`, rail `#f5f5f5`, tint `#f7f7f7`, white columns.
- Charcoal `#2b2b2b` fills primary buttons, the Today tag, selected chips, completed checkboxes, and the open mobile Unscheduled button.
- Hover on titles and earlier tasks underlines instead of changing colour.
- Focus rings are blue `#2563eb`, on every control, including selects, the capture field, and day composers. Blue is used for nothing else.
- Selection, drop targets, toasts, the backdrop, and checkbox accents are neutral. Placeholders use the muted gray at full opacity.
- Muted text is at least 5.9:1 on every surface it sits on. The `--control` border colour (`#858585`) is at least 3.6:1 on white; subtle dividers use lighter grays.

Opinion [high]: focus belongs on the task row, not in task details, because the task is already where the user's attention is.
This changes if users mostly start focus right after editing a task's next step, the details button would matter more than the row button. Both stay.

Opinion [medium]: an always-visible gray timer on every open row is worth its noise, because a hover-only control repeats the discoverability problem and does not work on touch.
This changes if weeks with many tasks per day look busy in real use, show the button only on hover and keyboard focus for desktop pointers, and always on touch.

## Unchanged

Storage key and version 1 format, older backups, durable active timer, early stopping, recorded time capped at the chosen duration, progress history, import and export, read-failure lock, save-failure banner, Alt+arrow moves, drag and drop, quick dates, From earlier, and Undo delete.

## Tests

New UI tests cover: the full loop from a task row (next step, custom minutes, outcome link, focus on the strip after Begin, the "In focus" marker, hidden timer buttons, focus into the progress field after Stop, focus back to the task after Save), minutes validation at 0, 181, 2.5, 180, and 1, Cancel returning focus to the task, "Save and start focus" from task details, and a timer that ends on its own without taking focus.

## Limits

- Not checked in a real browser by Claude. Visual layout, line clamping, sticky positioning, and the 50% cap were reasoned from CSS and need desktop and mobile checks.
- An accidental session can only end with a progress note. Setup is a separate step from the row button, so accidental starts should be rare. There is still no Discard.
- The timer button is always visible on open tasks (see the opinion above).
