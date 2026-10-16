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
  const inbox = screen.getByRole('complementary', {
    name: 'Unscheduled tasks',
  });
  await user.type(
    within(inbox).getByRole('textbox', { name: 'New task for unscheduled' }),
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
    await user.click(
      screen.getByRole('button', { name: 'Reopen Ship the planner' }),
    );
    expect(saved().tasks[0]).toMatchObject({
      title: 'Ship the planner',
      date: null,
      completed: false,
    });
  });
  it('edits a planning date and notes, then restores a deleted task', async () => {
    render(<App />);
    const user = await capture('Write outline');
    await user.click(
      screen.getByRole('button', { name: 'Write outline', exact: true }),
    );
    fireEvent.input(screen.getByLabelText(/Plan for/), {
      target: { value: dateKey(new Date()) },
    });
    await user.click(screen.getByRole('checkbox', { name: /Main outcome/ }));
    await user.type(
      screen.getByRole('textbox', { name: 'Notes Optional' }),
      'Start with the core idea',
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0]).toMatchObject({
      date: dateKey(new Date()),
      main: true,
      notes: 'Start with the core idea',
    });
    await user.click(
      screen.getByRole('button', { name: 'Write outline', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Delete task' }));
    expect(saved().tasks).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(saved().tasks).toHaveLength(1);
    expect(saved().tasks[0].notes).toBe('Start with the core idea');
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
  it('plans a task with a quick date in task details', async () => {
    render(<App />);
    const user = await capture('Book a call');
    await user.click(
      screen.getByRole('button', { name: 'Book a call', exact: true }),
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Quick dates' })).getByRole(
        'button',
        { name: 'Tomorrow' },
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0].date).toBe(tomorrow());
  });
  it('lists unfinished earlier tasks and moves one to today', async () => {
    stored([
      { id: 'old', title: 'Old task', date: '2020-01-06' },
      { id: 'done', title: 'Done task', date: '2020-01-06', completed: true },
    ]);
    render(<App />);
    const earlier = screen.getByRole('region', { name: /From earlier/ });
    expect(within(earlier).queryByText('Done task')).toBeNull();
    await userEvent
      .setup()
      .click(
        within(earlier).getByRole('button', { name: 'Move Old task to today' }),
      );
    expect(saved().tasks.find((task) => task.id === 'old')?.date).toBe(today);
    expect(screen.queryByRole('region', { name: /From earlier/ })).toBeNull();
  });
  it('adds calendar tasks in a dialog and cancels drafts with focus restored', async () => {
    render(<App />);
    const user = userEvent.setup();
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
    const title = within(
      screen.getByRole('region', { name: label(2) }),
    ).getByRole('button', { name: 'Friday task', exact: true });
    title.focus();
    await user.click(title);
    return user;
  }
  const quickDate = (name: string) =>
    within(screen.getByRole('group', { name: 'Quick dates' })).getByRole(
      'button',
      { name },
    );

  it('follows a task saved into another month and focuses it there', async () => {
    const user = await openFridayTask();
    fireEvent.input(screen.getByLabelText(/Plan for/), {
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
    fireEvent.input(screen.getByLabelText(/Plan for/), {
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
  it('opens Unscheduled when a task is saved without a date', async () => {
    const user = await openFridayTask();
    await user.click(quickDate('Unscheduled'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0]).toMatchObject({ date: null, main: false });
    expect(
      screen
        .getByRole('button', { name: /^Unscheduled/, expanded: true })
        .getAttribute('aria-expanded'),
    ).toBe('true');
    const inbox = screen.getByRole('complementary', {
      name: 'Unscheduled tasks',
    });
    expect(inbox.contains(document.activeElement)).toBe(true);
    expect(focusedTitle()).toBe('Friday task');
  });
  it('keeps the view and opener when details close without a date change', async () => {
    const user = await openFridayTask();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(quickDate('Next Monday'));
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
  it('returns focus to the From earlier opener after saving notes', async () => {
    stored([{ id: 'o', title: 'Old task', date: '2026-09-01' }]);
    render(<App />);
    const user = userEvent.setup();
    const opener = within(
      screen.getByRole('region', { name: /From earlier/ }),
    ).getByRole('button', { name: /^Open Old task/ });
    opener.focus();
    await user.click(opener);
    await user.type(
      screen.getByRole('textbox', { name: 'Notes Optional' }),
      'Still relevant',
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0]).toMatchObject({
      date: '2026-09-01',
      notes: 'Still relevant',
    });
    expect(document.activeElement).toBe(
      within(screen.getByRole('region', { name: /From earlier/ })).getByRole(
        'button',
        { name: /^Open Old task/ },
      ),
    );
    expect(screen.getByRole('region', { name: label(2) })).toBeTruthy();
  });
});

describe('meaningful focus loop', () => {
  it('keeps all extra panels off the calendar, including restored sessions', async () => {
    stored([{ id: 'hidden-focus', title: 'Existing task' }]);
    const original = saved();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...original,
        outcomes: { '2026-10-12': 'Legacy weekly outcome' },
      }),
    );
    render(<App />);
    expect(screen.queryByLabelText("This week's outcome")).toBeNull();
    expect(screen.queryByRole('region', { name: 'Focus session' })).toBeNull();
    expect(document.querySelector('main > .focus-panel')).toBeNull();
    expect(saved().outcomes).toEqual({ '2026-10-12': 'Legacy weekly outcome' });
  });
  it('links a task, reloads an active session, stops early and records useful progress', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        tasks: [],
        outcomes: { [dateKey(weekStart(new Date()))]: 'Launch pricing' },
      }),
    );
    const app = render(<App />);
    const user = await capture('Write pricing');
    await user.click(
      screen.getByRole('button', { name: 'Write pricing', exact: true }),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Next step Optional' }),
      'Draft three options',
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await user.click(
      screen.getByRole('button', { name: 'Write pricing', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Start focus' }));
    await user.click(screen.getByRole('button', { name: 'Begin session' }));
    expect(saved().focus?.duration).toBe(60);
    app.unmount();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: 'Write pricing', exact: true }),
    );
    expect(screen.getByLabelText('Time remaining')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Stop session' }));
    expect(
      screen.getByRole('button', { name: 'Finish session' }),
    ).toHaveProperty('disabled', false);

    await user.clear(screen.getByLabelText('Next step'));
    await user.type(
      screen.getByLabelText('Next step'),
      'Validate with a customer',
    );
    await user.click(screen.getByRole('button', { name: 'Finish session' }));
    expect(saved().focus).toBeNull();
    expect(saved().tasks[0]).toMatchObject({
      nextStep: 'Validate with a customer',
      completed: false,
    });
    expect(saved().tasks[0].sessions?.[0].progress).toBe('');
    await user.click(
      screen.getByRole('button', { name: 'Write pricing', exact: true }),
    );
    expect(
      screen.getByRole('region', { name: 'Progress history' }).textContent,
    ).toContain('Focus session');
  });
  it('recovers an elapsed timer and records completion without inflating time', async () => {
    stored([{ id: 'focus-task', title: 'Finish proposal' }]);
    const state = saved();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        focus: {
          taskId: 'focus-task',
          startedAt: Date.now() - 3600000,
          duration: 25,
        },
      }),
    );
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Finish proposal', exact: true }),
    );

    await user.click(screen.getByLabelText('Task complete'));
    await user.click(screen.getByRole('button', { name: 'Finish session' }));
    expect(saved().tasks[0].completed).toBe(true);
    expect(saved().tasks[0].sessions?.[0].minutes).toBe(25);
  });
});

describe('focus from the board', () => {
  const panel = () => screen.getByRole('region', { name: 'Focus session' });
  const title = (name: string) =>
    screen.getByRole('button', { name, exact: true });

  it('runs the whole loop from a task row and moves keyboard focus with it', async () => {
    stored([
      {
        id: 'p',
        title: 'Draft pricing',
        outcomeWeek: dateKey(weekStart(new Date())),
      },
      { id: 'q', title: 'Other task' },
    ]);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...saved(),
        outcomes: { [dateKey(weekStart(new Date()))]: 'Launch pricing' },
      }),
    );
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Focus on Draft pricing' }),
    );
    expect(document.activeElement).toBe(
      within(panel()).getByRole('textbox', { name: 'Next step Optional' }),
    );
    await user.keyboard('Write three options');
    const minutes = within(panel()).getByRole('spinbutton', {
      name: 'Minutes',
    });
    await user.clear(minutes);
    await user.type(minutes, '40');
    await user.click(screen.getByRole('button', { name: 'Begin session' }));
    expect(saved().focus).toMatchObject({ taskId: 'p', duration: 40 });
    expect(saved().tasks[0]).toMatchObject({
      nextStep: 'Write three options',
      outcomeWeek: Object.keys(saved().outcomes!)[0],
    });
    expect(document.activeElement).toBe(panel());
    expect(screen.getByText('In focus')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Focus on/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Stop session' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Finish session' }),
    );
    await user.click(screen.getByRole('button', { name: 'Finish session' }));
    expect(saved().focus).toBeNull();
    expect(saved().tasks[0].sessions?.[0].progress).toBe('');
    expect(screen.queryByRole('region', { name: 'Focus session' })).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Task', exact: true }),
    );
  });

  it('keeps minutes between 1 and 180 and cancels back to the task', async () => {
    stored([{ id: 'p', title: 'Plan sprint' }]);
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Focus on Plan sprint' }),
    );
    const minutes = screen.getByRole('spinbutton', { name: 'Minutes' });
    const begin = screen.getByRole('button', { name: 'Begin session' });
    for (const [value, valid] of [
      ['0', false],
      ['181', false],
      ['2.5', false],
      ['180', true],
      ['1', true],
    ] as const) {
      await user.clear(minutes);
      await user.type(minutes, value);
      expect((begin as HTMLButtonElement).disabled).toBe(!valid);
    }
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('region', { name: 'Focus session' })).toBeNull();
    expect(saved().focus ?? null).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Task', exact: true }),
    );
  });

  it('saves pending detail edits when starting focus from task details', async () => {
    stored([{ id: 'p', title: 'Old name' }]);
    render(<App />);
    const user = userEvent.setup();
    await user.click(title('Old name'));
    const name = screen.getByRole('textbox', { name: 'Task', exact: true });
    await user.clear(name);
    await user.type(name, 'New name');
    await user.click(
      screen.getByRole('button', { name: 'Save and start focus' }),
    );
    expect(saved().tasks[0].title).toBe('New name');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(panel().textContent).toContain('New name');
    expect(document.activeElement).toBe(
      within(panel()).getByRole('textbox', { name: 'Next step Optional' }),
    );
  });

  it('does not pull focus away when a timer ends on its own', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      stored([{ id: 'p', title: 'Short task' }]);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...saved(),
          focus: { taskId: 'p', startedAt: Date.now() - 59000, duration: 1 },
        }),
      );
      render(<App />);
      fireEvent.click(
        screen.getByRole('button', { name: 'Short task', exact: true }),
      );
      const capture = screen.getByRole('textbox', {
        name: 'New task for unscheduled',
      });
      capture.focus();
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(
        screen.getByRole('button', { name: 'Finish session' }),
      ).toBeTruthy();
      expect(document.activeElement).toBe(capture);
    } finally {
      vi.useRealTimers();
    }
  });
});

it('keeps next-step edits made while a focus session is running', async () => {
  stored([
    { id: 'edit-running', title: 'Draft offer', nextStep: 'Write outline' },
  ]);
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Focus on Draft offer' }),
  );
  await user.click(screen.getByRole('button', { name: 'Begin session' }));
  await user.click(
    screen.getByRole('button', { name: 'Draft offer', exact: true }),
  );
  await user.clear(screen.getByRole('textbox', { name: 'Next step Optional' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Next step Optional' }),
    'Review new outline',
  );
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await user.click(screen.getByRole('button', { name: 'Stop session' }));
  expect(screen.getByRole('textbox', { name: 'Next step' })).toHaveProperty(
    'value',
    'Review new outline',
  );

  await user.click(screen.getByRole('button', { name: 'Finish session' }));
  expect(saved().tasks[0].nextStep).toBe('Review new outline');
});

it('keeps board completion made while reviewing a focus session', async () => {
  stored([{ id: 'review-complete', title: 'Send offer' }]);
  render(<App />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Focus on Send offer' }));
  await user.click(screen.getByRole('button', { name: 'Begin session' }));
  await user.click(screen.getByRole('button', { name: 'Stop session' }));
  await user.click(screen.getByRole('button', { name: 'Complete Send offer' }));
  expect(screen.getByLabelText('Task complete')).toHaveProperty(
    'checked',
    true,
  );

  await user.click(screen.getByRole('button', { name: 'Finish session' }));
  expect(saved().tasks[0].completed).toBe(true);
});

it('syncs untouched review steps and preserves explicit review edits', async () => {
  stored([
    { id: 'review-step', title: 'Refine offer', nextStep: 'First step' },
  ]);
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Focus on Refine offer' }),
  );
  await user.click(screen.getByRole('button', { name: 'Begin session' }));
  await user.click(screen.getByRole('button', { name: 'Stop session' }));
  const changeDetail = async (value: string) => {
    await user.click(
      screen.getByRole('button', { name: 'Refine offer', exact: true }),
    );
    await user.clear(
      screen.getByRole('textbox', { name: 'Next step Optional' }),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Next step Optional' }),
      value,
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
  };
  await changeDetail('New saved step');
  expect(
    screen.getByRole('textbox', { name: 'Next step', exact: true }),
  ).toHaveProperty('value', 'New saved step');
  await user.clear(
    screen.getByRole('textbox', { name: 'Next step', exact: true }),
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Next step', exact: true }),
    'Explicit review step',
  );
  await changeDetail('Another saved step');
  expect(
    screen.getByRole('textbox', { name: 'Next step', exact: true }),
  ).toHaveProperty('value', 'Explicit review step');

  await user.click(screen.getByRole('button', { name: 'Finish session' }));
  expect(saved().tasks[0].nextStep).toBe('Explicit review step');
});

it('keeps optional progress notes on the task across reloads without a session question', async () => {
  stored([
    {
      id: 'legacy',
      title: 'Plan launch',
      sessions: [
        {
          id: 'session-old',
          startedAt: 100000,
          endedAt: 160000,
          minutes: 1,
          progress: 'Legacy session note',
        },
      ],
    },
  ]);
  const app = render(<App />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Plan launch', exact: true }),
  );
  expect(screen.getByText('Legacy session note')).toBeTruthy();
  await user.type(
    screen.getByRole('textbox', { name: 'Progress notes Optional' }),
    'Pricing draft reviewed',
  );
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(saved().tasks[0].progressNotes).toBe('Pricing draft reviewed');
  app.unmount();
  render(<App />);
  await user.click(
    screen.getByRole('button', { name: 'Plan launch', exact: true }),
  );
  expect(
    screen.getByRole('textbox', { name: 'Progress notes Optional' }),
  ).toHaveProperty('value', 'Pricing draft reviewed');
  await user.click(screen.getByRole('button', { name: 'Close task details' }));
  await user.click(
    screen.getByRole('button', { name: 'Focus on Plan launch' }),
  );
  await user.click(screen.getByRole('button', { name: 'Begin session' }));
  await user.click(screen.getByRole('button', { name: 'Stop session' }));
  expect(screen.queryByLabelText('What moved forward?')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Finish session' }));
  expect(saved().focus).toBeNull();
  expect(saved().tasks[0].progressNotes).toBe('Pricing draft reviewed');
  expect(saved().tasks[0].sessions?.at(-1)?.progress).toBe('');
  expect(saved().tasks[0].sessions?.[0].progress).toBe('Legacy session note');
});

it('finishing focus keeps unsaved task notes and saving details preserves the focus next step', async () => {
  stored([{ id: 'draft-focus', title: 'Keep drafts' }]);
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Focus on Keep drafts' }),
  );
  const focus = screen.getByRole('region', { name: 'Focus session' });
  await user.type(
    within(focus).getByRole('textbox', { name: 'Next step Optional' }),
    'Draft options',
  );
  await user.click(screen.getByRole('button', { name: 'Begin session' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Progress notes Optional' }),
    'Unsaved progress draft',
  );
  await user.click(screen.getByRole('button', { name: 'Stop session' }));
  await user.click(screen.getByRole('button', { name: 'Finish session' }));
  expect(
    screen.getByRole('textbox', { name: 'Progress notes Optional' }),
  ).toHaveProperty('value', 'Unsaved progress draft');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(saved().tasks[0]).toMatchObject({
    nextStep: 'Draft options',
    progressNotes: 'Unsaved progress draft',
  });
});

it('shows live active and ended timer states on the task and opens the session', () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  try {
    stored([{ id: 'live', title: 'Live timer' }]);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...saved(),
        focus: { taskId: 'live', startedAt: Date.now() - 59000, duration: 1 },
      }),
    );
    render(<App />);
    const timer = screen.getByRole('button', {
      name: 'Open active timer for Live timer',
    });
    expect(timer.textContent).toContain('00:01');
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    const ended = screen.getByRole('button', {
      name: 'Finish session for Live timer',
    });
    expect(ended.textContent).toContain('Done');
    fireEvent.click(ended);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Finish session', exact: true }),
    );
    expect(saved().focus).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Focus on Live timer' }),
    ).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});

it('hides unwanted task fields while preserving their saved values', async () => {
  stored([
    { id: 'legacy-fields', title: 'Simple details', outcomeWeek: '2026-10-12' },
  ]);
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Simple details', exact: true }),
  );
  expect(screen.queryByLabelText('Weekly outcome')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Up', exact: true })).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Down', exact: true }),
  ).toBeNull();
  await user.type(
    screen.getByRole('textbox', { name: 'Notes Optional' }),
    'Keep this note',
  );
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(saved().tasks[0].outcomeWeek).toBe('2026-10-12');
});

it('opens active timer controls with focus and does not reopen setup after finishing', async () => {
  stored([{ id: 'resume', title: 'Resume work' }]);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...saved(),
      focus: { taskId: 'resume', startedAt: Date.now(), duration: 60 },
    }),
  );
  render(<App />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: 'Open active timer for Resume work' }),
  );
  expect(document.activeElement).toBe(
    screen.getByRole('region', { name: 'Focus session' }),
  );
  await user.click(screen.getByRole('button', { name: 'Stop session' }));
  await user.click(
    screen.getByRole('button', { name: 'Finish session', exact: true }),
  );
  expect(screen.queryByRole('region', { name: 'Focus session' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Begin session' })).toBeNull();
});

describe('year, month, and goal planning', () => {
  it('defaults to month and drills from the year overview into a month', async () => {
    render(<App />);
    const user = userEvent.setup();
    const current = new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(new Date());
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
    expect(screen.getByLabelText('Goal')).toHaveProperty('value', goal.id);
    fireEvent.input(screen.getByLabelText(/Plan for/), {
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
