import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { dateKey, decodeState, STORAGE_KEY, weekStart } from '../src/model';

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '');
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function capture(title: string) {
  const user = userEvent.setup();
  await user.type(
    screen.getByRole('textbox', { name: 'New task', exact: true }),
    `${title}{Enter}`,
  );
  return user;
}
const saved = () => decodeState(localStorage.getItem(STORAGE_KEY));
const today = dateKey(new Date());
const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dateKey(date);
};
const stored = (tasks: object[]) =>
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      tasks: tasks.map((task) => ({
        date: null,
        notes: '',
        completed: false,
        main: false,
        ...task,
      })),
    }),
  );

describe('planner user flows', () => {
  it('captures, completes, and reopens a task across a reload', async () => {
    const app = render(<App />);
    const user = await capture('Ship the planner');
    await user.click(
      screen.getByRole('button', { name: 'Complete Ship the planner' }),
    );
    expect(saved().tasks[0].completed).toBe(true);
    app.unmount();
    render(<App />);
    expect(
      screen.queryByRole('button', { name: 'Reopen Ship the planner' }),
    ).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: 'Show completed' }));
    await user.click(
      screen.getByRole('button', { name: 'Reopen Ship the planner' }),
    );
    expect(saved().tasks[0]).toMatchObject({
      title: 'Ship the planner',
      date: null,
      completed: false,
    });
  });
  it('edits only title and date and preserves notes through saving, deletion and undo', async () => {
    stored([
      {
        id: 'outline',
        title: 'Write outline',
        notes: 'Start with the core idea',
        nextStep: 'Legacy step',
        progressNotes: 'Legacy progress',
        sessions: [
          {
            id: 'old-session',
            startedAt: 1000,
            endedAt: 61000,
            minutes: 1,
            progress: 'Old session notes',
          },
        ],
      },
    ]);
    const originalTask = saved().tasks[0];
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Write outline', exact: true }),
    );
    fireEvent.input(screen.getByLabelText('Date (optional)'), {
      target: { value: dateKey(new Date()) },
    });
    const editor = screen.getByRole('dialog', { name: 'Task details' });
    await user.clear(within(editor).getByLabelText('Task', { exact: true }));
    await user.type(
      within(editor).getByLabelText('Task', { exact: true }),
      'Updated outline',
    );
    expect(editor.querySelectorAll('input, textarea, select')).toHaveLength(2);
    expect(within(editor).queryByText('Notes')).toBeNull();
    expect(within(editor).queryByLabelText('Goal')).toBeNull();
    expect(within(editor).queryByRole('checkbox')).toBeNull();
    expect(within(editor).queryByRole('button', { name: /focus/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0]).toMatchObject({
      date: dateKey(new Date()),
      nextStep: 'Legacy step',
      progressNotes: 'Legacy progress',
      notes: 'Start with the core idea',
    });
    await user.click(
      screen.getByRole('button', { name: 'Updated outline', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Delete task' }));
    expect(saved().tasks).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(saved().tasks).toHaveLength(1);
    expect(saved().tasks[0]).toEqual({
      ...originalTask,
      title: 'Updated outline',
      date: dateKey(new Date()),
    });
  });
  it('warns when saving fails, keeps the task, and retries the latest state', async () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });
    render(<App />);
    const user = await capture('Keep unsaved work');
    expect(screen.getByRole('alert').textContent).toContain(
      'could not be saved',
    );
    expect(
      screen.getByRole('button', { name: 'Keep unsaved work', exact: true }),
    ).toBeTruthy();
    setItem.mockRestore();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(saved().tasks[0].title).toBe('Keep unsaved work');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('leaves unreadable data intact and locks editing until recovery', async () => {
    localStorage.setItem(STORAGE_KEY, '{invalid');
    render(<App />);
    expect(screen.getByRole('alert').textContent).toContain(
      'not been overwritten',
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{invalid');
    expect(screen.getByRole('main').querySelector('fieldset')?.disabled).toBe(
      true,
    );
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, tasks: [] }),
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('main').querySelector('fieldset')?.disabled).toBe(
      false,
    );
  });
  it('requires a decision before discarding edits', async () => {
    render(<App />);
    const user = await capture('Original title');
    await user.click(
      screen.getByRole('button', { name: 'Original title', exact: true }),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Task', exact: true }),
      ' changed',
    );

    await user.click(
      screen.getByRole('button', { name: 'Close task details' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Discard changes?' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(
      screen.queryByRole('dialog', { name: 'Discard changes?' }),
    ).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Task details' })).toBeTruthy();
    expect(saved().tasks[0].title).toBe('Original title');
  });

  it('restores a backup even when unreadable storage has locked planning', async () => {
    localStorage.setItem(STORAGE_KEY, '{invalid');
    render(<App />);
    const task = {
      id: 'restored',
      title: 'Restored task',
      date: null,
      notes: '',
      completed: false,
      main: false,
    };
    const content = JSON.stringify({ version: 1, tasks: [task] });
    const file = new File([content], 'backup.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: async () => content });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const input = screen.getByLabelText(
      'Import planner backup',
    ) as HTMLInputElement;
    expect(input.closest('fieldset[disabled]')).toBeNull();
    await userEvent.setup().upload(input, file);
    await waitFor(() => expect(saved().tasks[0].title).toBe('Restored task'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('rejects invalid backups without replacing existing work', async () => {
    render(<App />);
    await capture('Keep this task');
    const file = new File(['invalid'], 'backup.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: async () => 'invalid' });
    await userEvent
      .setup()
      .upload(screen.getByLabelText('Import planner backup'), file);
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain(
        'Could not import',
      ),
    );
    expect(saved().tasks[0].title).toBe('Keep this task');
  });
  it('offers the raw saved data, not an empty planner, while storage is unreadable', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid');
    render(<App />);
    const exportButton = screen.getByRole('button', {
      name: 'Export backup',
    }) as HTMLButtonElement;
    expect(exportButton.disabled).toBe(true);
    expect(
      within(screen.getByRole('alert')).getByRole('button', {
        name: 'Download saved data',
      }),
    ).toBeTruthy();
  });
  it('moves and reorders tasks with Alt and arrow keys, keeping focus', async () => {
    stored([
      { id: 'a', title: 'First' },
      { id: 'b', title: 'Second' },
    ]);
    render(<App />);
    const user = userEvent.setup();
    const second = screen.getByRole('button', { name: 'Second', exact: true });
    second.focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(saved().tasks.map((task) => task.id)).toEqual(['b', 'a']);
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(saved().tasks.find((task) => task.id === 'b')?.date).toBe(today);
    expect(document.activeElement?.textContent).toBe('Second');
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(saved().tasks.find((task) => task.id === 'b')?.date).toBe(
      tomorrow(),
    );
    expect(document.activeElement?.textContent).toBe('Second');
  });
  it('plans a task with the optional date field', async () => {
    render(<App />);
    const user = await capture('Book a call');
    await user.click(
      screen.getByRole('button', { name: 'Book a call', exact: true }),
    );
    fireEvent.input(screen.getByLabelText('Date (optional)'), {
      target: { value: tomorrow() },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0].date).toBe(tomorrow());
  });
  it('keeps past tasks and can show completed tasks without an Unscheduled rail', async () => {
    stored([
      { id: 'old', title: 'Old task', date: '2020-01-01' },
      { id: 'done', title: 'Done task', date: '2020-01-01', completed: true },
    ]);
    render(<App />);
    expect(screen.queryByRole('complementary')).toBeNull();
    const tasks = screen.getByRole('region', { name: 'Tasks', exact: true });
    expect(
      within(tasks).getByRole('button', { name: 'Old task', exact: true }),
    ).toBeTruthy();
    expect(
      within(tasks).queryByRole('button', { name: 'Reopen Done task' }),
    ).toBeNull();
    await userEvent
      .setup()
      .click(screen.getByRole('checkbox', { name: 'Show completed' }));
    expect(
      within(tasks).getByRole('button', { name: 'Reopen Done task' }),
    ).toBeTruthy();
  });
  it('adds calendar tasks in a dialog and cancels drafts with focus restored', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Month', exact: true }),
    );
    const add = screen.getAllByRole('button', { name: /^Add task to / })[0];
    const name = add.getAttribute('aria-label');
    await user.click(add);
    expect(screen.getByRole('dialog', { name: 'Add a task' })).toBeTruthy();
    await user.keyboard('Unfinished draft{Escape}');
    expect(saved().tasks).toHaveLength(0);
    expect(screen.queryByRole('dialog', { name: 'Add a task' })).toBeNull();
    expect(document.activeElement?.getAttribute('aria-label')).toBe(name);
    await user.click(screen.getByRole('button', { name: name! }));
    await user.keyboard('Draft{Enter}');
    expect(saved().tasks[0].title).toBe('Draft');
    expect(screen.queryByRole('dialog', { name: 'Add a task' })).toBeNull();
    expect(document.activeElement?.getAttribute('aria-label')).toBe(name);
  });
});

describe('closing task details after a date change', () => {
  // Friday 2 October 2026, with weekends hidden by default.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 2, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const label = (day: number, month = 9) => {
    const date = new Date(2026, month, day, 12);
    return `${new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date)} ${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date)}`;
  };
  const focusedTitle = () => document.activeElement?.textContent;
  async function openFridayTask() {
    stored([{ id: 'f', title: 'Friday task', date: '2026-10-02' }]);
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Month', exact: true }),
    );
    const title = within(
      screen.getByRole('region', { name: label(2) }),
    ).getByRole('button', { name: 'Friday task', exact: true });
    title.focus();
    await user.click(title);
    return user;
  }
  it('follows a task saved into another month and focuses it there', async () => {
    const user = await openFridayTask();
    fireEvent.input(screen.getByLabelText('Date (optional)'), {
      target: { value: '2026-11-02' },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0].date).toBe('2026-11-02');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      'November',
    );
    const monday = screen.getByRole('region', { name: label(2, 10) });
    expect(monday.contains(document.activeElement)).toBe(true);
    expect(focusedTitle()).toBe('Friday task');
  });
  it('keeps weekends visible when a task is saved to Saturday', async () => {
    const user = await openFridayTask();
    expect(screen.getByRole('region', { name: label(3) })).toBeTruthy();
    fireEvent.input(screen.getByLabelText('Date (optional)'), {
      target: { value: '2026-10-03' },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0].date).toBe('2026-10-03');
    const saturday = screen.getByRole('region', { name: label(3) });
    expect(
      screen
        .getByRole('button', { name: `Select ${label(3)}` })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(saturday.contains(document.activeElement)).toBe(true);
  });
  it('opens Tasks when a calendar task is saved without a date', async () => {
    const user = await openFridayTask();
    await user.click(screen.getByRole('button', { name: 'Clear date' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0]).toMatchObject({ date: null, main: false });
    const tasks = screen.getByRole('region', { name: 'Tasks', exact: true });
    expect(tasks.contains(document.activeElement)).toBe(true);
    expect(focusedTitle()).toBe('Friday task');
  });
  it('keeps the view and opener when details close without a date change', async () => {
    const user = await openFridayTask();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.input(screen.getByLabelText('Date (optional)'), {
      target: { value: '2026-10-05' },
    });
    await user.click(
      screen.getByRole('button', { name: 'Close task details' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Discard changes', exact: true }),
    );
    expect(saved().tasks[0].date).toBe('2026-10-02');
    expect(screen.getByRole('region', { name: label(2) })).toBeTruthy();
    expect(focusedTitle()).toBe('Friday task');
  });
  it('keeps the task list and focuses the renamed task without changing its date', async () => {
    stored([{ id: 'o', title: 'Old task', date: '2026-09-01' }]);
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Old task', exact: true }),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Task', exact: true }),
      ' updated',
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0]).toMatchObject({
      date: '2026-09-01',
      title: 'Old task updated',
    });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Old task updated', exact: true }),
    );
    expect(
      screen.getByRole('region', { name: 'Tasks', exact: true }),
    ).toBeTruthy();
  });
});

describe('separate focus action', () => {
  it('opens focus without task fields and validates the duration', async () => {
    render(<App />);
    const user = await capture('Deep work');
    await user.click(
      screen.getByRole('button', { name: 'Focus on Deep work' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Focus', exact: true }),
    ).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Task details' })).toBeNull();
    expect(screen.queryByLabelText('Task', { exact: true })).toBeNull();
    await user.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '181');
    expect(
      screen
        .getByRole('button', { name: 'Begin session' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(saved().focus ?? null).toBeNull();
    await user.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '25');
    await user.click(screen.getByRole('button', { name: 'Begin session' }));
    expect(saved().focus?.duration).toBe(25);
    expect(screen.getByLabelText('Time remaining').textContent).toBe('25:00');
  });

  it('keeps a session across reloads, reopens its timer and preserves legacy metadata when finishing', async () => {
    stored([
      {
        id: 'work',
        title: 'Work',
        notes: 'Keep my notes',
        nextStep: 'Legacy next step',
        progressNotes: 'Legacy progress',
      },
    ]);
    const app = render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Focus on Work' }));
    await user.click(screen.getByRole('button', { name: 'Begin session' }));
    await user.click(
      screen.getByRole('button', { name: 'Close focus', exact: true }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(saved().focus?.taskId).toBe('work');
    app.unmount();
    render(<App />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(
      screen.getByRole('button', { name: 'Open active timer for Work' }),
    );
    await user.click(screen.getByRole('button', { name: 'Stop session' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Finish session' }),
    );
    expect(
      screen.queryByRole('checkbox', { name: 'Task complete' }),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Finish session' }));
    expect(saved().focus).toBeNull();
    expect(saved().tasks[0]).toMatchObject({
      notes: 'Keep my notes',
      nextStep: 'Legacy next step',
      progressNotes: 'Legacy progress',
      completed: false,
    });
    expect(saved().tasks[0].sessions).toHaveLength(1);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Work', exact: true }),
    );
  });

  it('keeps completion on the row even while a session is active', async () => {
    render(<App />);
    const user = await capture('Finish work');
    await user.click(
      screen.getByRole('button', { name: 'Focus on Finish work' }),
    );
    await user.click(screen.getByRole('button', { name: 'Begin session' }));
    await user.click(
      screen.getByRole('button', { name: 'Close focus', exact: true }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Complete Finish work' }),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Show completed' }));
    await user.click(
      screen.getByRole('button', { name: 'Open active timer for Finish work' }),
    );
    await user.click(screen.getByRole('button', { name: 'Stop session' }));
    await user.click(screen.getByRole('button', { name: 'Finish session' }));
    expect(saved().tasks[0].completed).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Reopen Finish work' }),
    ).toBeTruthy();
  });

  it('reopens expired sessions for finishing without showing task editing', async () => {
    stored([{ id: 'expired', title: 'Expired session' }]);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...saved(),
        focus: {
          taskId: 'expired',
          startedAt: Date.now() - 120000,
          duration: 1,
        },
      }),
    );
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', {
        name: 'Finish session for Expired session',
      }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Focus', exact: true }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Finish session' }));
    expect(saved().tasks[0].sessions?.[0].minutes).toBe(1);
  });
});

describe('year, month, and goal planning', () => {
  it('defaults to Tasks and drills from the year overview into a month', async () => {
    render(<App />);
    const user = userEvent.setup();
    const current = new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(new Date());
    expect(
      screen
        .getByRole('button', { name: 'Tasks', exact: true })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('textbox', { name: 'New task', exact: true }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Month', exact: true }),
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(current);
    expect(
      screen
        .getByRole('button', { name: 'Month', exact: true })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Year', exact: true }));
    expect(
      screen.getAllByRole('button', { name: /^Open .* \d{4}$/ }),
    ).toHaveLength(12);
    await user.click(
      screen.getByRole('button', {
        name: `Open March ${new Date().getFullYear()}`,
      }),
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      'March',
    );
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      'April',
    );
  });

  it('shares an action between its goal and month, and preserves it when removing the goal', async () => {
    const app = render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Goals', exact: true }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Add goal', exact: true }),
    );
    await user.type(
      screen.getByLabelText('Goal name'),
      'Launch a course{Enter}',
    );
    const goal = saved().goals![0];
    await user.type(
      screen.getByLabelText('New action for Launch a course'),
      'Write first lesson{Enter}',
    );
    const action = saved().tasks[0];
    expect(action).toMatchObject({ goalId: goal.id, date: null });
    await user.click(
      screen.getByRole('button', { name: 'Write first lesson', exact: true }),
    );
    expect(screen.queryByLabelText('Goal')).toBeNull();
    fireEvent.input(screen.getByLabelText('Date (optional)'), {
      target: { value: dateKey(new Date()) },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      screen
        .getByRole('button', { name: 'Month', exact: true })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    await user.click(
      screen.getByRole('button', { name: 'Complete Write first lesson' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Goals', exact: true }),
    );
    expect(
      screen
        .getByRole('button', { name: 'Reopen Write first lesson' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.queryByText('1 of 1 actions complete')).toBeNull();
    app.unmount();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: 'Goals', exact: true }),
    );
    expect(
      screen.getByRole('region', { name: 'Goal: Launch a course' }),
    ).toBeTruthy();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(
      screen.getByRole('button', { name: 'Remove goal Launch a course' }),
    );
    await user.click(
      within(screen.getByRole('dialog', { name: 'Remove goal' })).getByRole(
        'button',
        { name: 'Remove goal', exact: true },
      ),
    );
    expect(saved().goals).toEqual([]);
    expect(saved().tasks).toHaveLength(1);
    expect(saved().tasks[0]).toMatchObject({
      id: action.id,
      goalId: null,
      date: dateKey(new Date()),
      completed: true,
    });
  });

  it('limits each year to four goals and can rename a goal without losing actions', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Goals', exact: true }),
    );
    for (let i = 1; i <= 4; i++) {
      await user.click(
        screen.getByRole('button', { name: 'Add goal', exact: true }),
      );
      await user.type(screen.getByLabelText('Goal name'), `Goal ${i}{Enter}`);
    }
    expect(saved().goals).toHaveLength(4);
    expect(document.activeElement).toBe(
      screen.getByLabelText('New action for Goal 4'),
    );
    expect(
      screen.queryByRole('button', { name: 'Add goal', exact: true }),
    ).toBeNull();
    const id = saved().goals![0].id;
    await user.type(
      screen.getByLabelText('New action for Goal 1'),
      'First action{Enter}',
    );
    await user.click(screen.getByRole('button', { name: 'Edit goal Goal 1' }));
    await user.clear(screen.getByLabelText('Goal name'));
    await user.type(screen.getByLabelText('Goal name'), 'Renamed goal');
    await user.click(screen.getByRole('button', { name: 'Save goal' }));
    expect(saved().goals![0]).toMatchObject({ id, title: 'Renamed goal' });
    expect(saved().tasks[0].goalId).toBe(id);
    await user.click(screen.getByRole('button', { name: 'Next year' }));
    expect(
      screen.getByRole('button', { name: 'Add goal', exact: true }),
    ).toBeTruthy();
  });

  it('shows the selected day once on mobile and keeps date selection working', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    try {
      stored([
        {
          id: 'mobile-date',
          title: 'Mobile action',
          date: dateKey(new Date()),
        },
      ]);
      render(<App />);
      expect(
        screen.getAllByRole('button', { name: 'Mobile action', exact: true }),
      ).toHaveLength(1);
      const user = userEvent.setup();
      await user.click(
        screen.getByRole('button', { name: 'Month', exact: true }),
      );
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const label = `${new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date)} ${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date)}`;
      await user.click(screen.getByRole('button', { name: `Select ${label}` }));
      expect(
        screen.queryByRole('button', { name: 'Mobile action', exact: true }),
      ).toBeNull();
      expect(
        screen.getByRole('region', { name: `Tasks for ${label}` }),
      ).toBeTruthy();
    } finally {
      delete (window as unknown as { matchMedia?: unknown }).matchMedia;
    }
  });
});

it('reorders goal actions across dates without changing other goals or enabling drag', async () => {
  const year = new Date().getFullYear();
  const base = {
    version: 1,
    goals: [
      { id: 'a', title: 'Goal A', year },
      { id: 'b', title: 'Goal B', year },
    ],
    tasks: [
      {
        id: 'a1',
        title: 'Action A1',
        date: `${year}-01-01`,
        completed: false,
        notes: '',
        main: false,
        goalId: 'a',
      },
      {
        id: 'b1',
        title: 'Action B1',
        date: `${year}-01-01`,
        completed: false,
        notes: '',
        main: false,
        goalId: 'b',
      },
      {
        id: 'a2',
        title: 'Action A2',
        date: `${year}-02-01`,
        completed: false,
        notes: '',
        main: false,
        goalId: 'a',
      },
    ],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
  render(<App />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Goals', exact: true }));
  const action = screen.getByRole('button', { name: 'Action A1', exact: true });
  expect(action.closest('li')?.getAttribute('draggable')).toBe('false');
  action.focus();
  await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
  expect(
    saved()
      .tasks.filter((task) => task.goalId === 'a')
      .map((task) => task.id),
  ).toEqual(['a2', 'a1']);
  expect(saved().tasks.find((task) => task.id === 'b1')).toMatchObject(
    base.tasks[1],
  );
  expect(document.activeElement?.textContent).toBe('Action A1');
});

it('cancels goal creation without saving and returns focus to Add goal', async () => {
  render(<App />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Goals', exact: true }));
  const add = screen.getByRole('button', { name: 'Add goal', exact: true });
  await user.click(add);
  expect(document.activeElement).toBe(screen.getByLabelText('Goal name'));
  await user.keyboard('A draft goal{Escape}');
  expect(saved().goals ?? []).toEqual([]);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(add);
});

it('persists light and dark mode without changing planner data', async () => {
  localStorage.setItem('ultrafocussed.theme', 'dark');
  stored([{ id: 'theme-task', title: 'Keep this task' }]);
  const app = render(<App />);
  const user = userEvent.setup();
  expect(document.documentElement.dataset.theme).toBe('dark');
  await user.click(
    screen.getByRole('button', { name: 'Switch to light mode' }),
  );
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.getItem('ultrafocussed.theme')).toBe('light');
  expect(saved().tasks[0].title).toBe('Keep this task');
  app.unmount();
  render(<App />);
  expect(document.documentElement.dataset.theme).toBe('light');
  await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('ultrafocussed.theme')).toBe('dark');
});

describe('Tasks brain dump', () => {
  it('lists all existing tasks and captures new tasks without dates', async () => {
    stored([
      { id: 'today', title: 'Today work', date: today },
      { id: 'future', title: 'Future work', date: tomorrow() },
      { id: 'past', title: 'Past work', date: '2020-01-01' },
      { id: 'inbox', title: 'Undated work' },
      { id: 'done', title: 'Completed work', date: today, completed: true },
    ]);
    render(<App />);
    const user = userEvent.setup();
    const tasks = screen.getByRole('region', { name: 'Tasks', exact: true });
    for (const title of [
      'Today work',
      'Future work',
      'Past work',
      'Undated work',
    ]) {
      expect(
        within(tasks).getByRole('button', { name: title, exact: true }),
      ).toBeTruthy();
    }
    expect(
      within(tasks).queryByRole('button', {
        name: 'Completed work',
        exact: true,
      }),
    ).toBeNull();
    expect(saved().tasks.find((task) => task.id === 'done')?.completed).toBe(
      true,
    );
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Today', exact: true }),
    ).toBeNull();
    const input = screen.getByRole('textbox', {
      name: 'New task',
      exact: true,
    });
    await user.type(input, '  Brain dump idea  {Enter}');
    expect(input).toHaveProperty('value', '');
    expect(saved().tasks).toHaveLength(6);
    expect(
      saved().tasks.find((task) => task.title === 'Brain dump idea')?.date,
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Edit date for Brain dump idea' })
        .textContent,
    ).toBe('Add date');
  });

  it('keeps scheduled tasks in Tasks and shares dates and completion with Month', async () => {
    render(<App />);
    const user = await capture('Schedule this');
    const id = saved().tasks[0].id;
    await user.click(
      screen.getByRole('button', { name: 'Edit date for Schedule this' }),
    );
    expect(document.activeElement).toBe(
      screen.getByLabelText('Date (optional)'),
    );
    fireEvent.input(screen.getByLabelText('Date (optional)'), {
      target: { value: today },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      screen.getByRole('region', { name: 'Tasks', exact: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Edit date for Schedule this' })
        .textContent,
    ).not.toBe('Add date');
    expect(saved().tasks[0]).toMatchObject({ id, date: today });
    await user.click(
      screen.getByRole('button', { name: 'Complete Schedule this' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Month', exact: true }),
    );
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Reopen Schedule this' }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Tasks', exact: true }),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Show completed' }));
    await user.click(
      screen.getByRole('button', { name: 'Edit date for Schedule this' }),
    );
    expect(document.activeElement).toBe(
      screen.getByLabelText('Date (optional)'),
    );
    await user.click(screen.getByRole('button', { name: 'Clear date' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks).toHaveLength(1);
    expect(saved().tasks[0]).toMatchObject({ id, date: null, completed: true });
    expect(
      screen.getByRole('button', { name: 'Schedule this', exact: true }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Month', exact: true }),
    );
    expect(
      screen.queryByRole('button', { name: 'Schedule this', exact: true }),
    ).toBeNull();
  });

  it('keeps focus and keyboard reordering in Tasks without changing unrelated dates', async () => {
    stored([
      { id: 'a', title: 'First dated', date: today },
      { id: 'b', title: 'Second dated', date: tomorrow() },
    ]);
    render(<App />);
    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Second dated', exact: true }).focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(saved().tasks.map((task) => task.id)).toEqual(['b', 'a']);
    expect(saved().tasks.find((task) => task.id === 'b')?.date).toBe(
      tomorrow(),
    );
    expect(saved().tasks.find((task) => task.id === 'a')?.date).toBe(today);
    await user.click(
      screen.getByRole('button', { name: 'Focus on Second dated' }),
    );
    await user.click(screen.getByRole('button', { name: 'Begin session' }));
    await user.click(screen.getByRole('button', { name: 'Stop session' }));
    await user.click(screen.getByRole('button', { name: 'Finish session' }));
    expect(
      screen.getByRole('region', { name: 'Tasks', exact: true }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Second dated', exact: true }),
    );
  });
});

it('hides completed rows, keeps keyboard focus useful, and can show and reopen them', async () => {
  stored([
    { id: 'one', title: 'First item' },
    { id: 'two', title: 'Second item', date: today },
  ]);
  render(<App />);
  const user = userEvent.setup();
  const toggle = screen.getByRole('checkbox', { name: 'Show completed' });
  expect(toggle).toHaveProperty('checked', false);
  await user.click(screen.getByRole('button', { name: 'Complete First item' }));
  expect(
    screen.queryByRole('button', { name: 'First item', exact: true }),
  ).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Second item', exact: true }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Complete Second item' }),
  );
  expect(screen.getByText('No open tasks.')).toBeTruthy();
  expect(document.activeElement).toBe(
    screen.getByRole('textbox', { name: 'New task', exact: true }),
  );
  await user.click(toggle);
  expect(
    screen.getByRole('button', { name: 'Reopen First item' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Reopen Second item' }),
  ).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Reopen First item' }));
  await user.click(toggle);
  expect(
    screen.getByRole('button', { name: 'Complete First item' }),
  ).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Second item', exact: true }),
  ).toBeNull();
  expect(saved().tasks).toHaveLength(2);
  expect(saved().tasks.find((task) => task.id === 'two')).toMatchObject({
    completed: true,
    date: today,
  });
});
