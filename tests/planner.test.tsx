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
import { dateKey, decodeState, STORAGE_KEY } from '../src/model';

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
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(
      screen.getByRole('button', { name: 'Close task details' }),
    );
    expect(confirm).toHaveBeenCalled();
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
  it('closes a day composer with Escape and returns focus to Add task', async () => {
    render(<App />);
    const user = userEvent.setup();
    const add = screen.getAllByRole('button', { name: /^Add task to / })[0];
    const name = add.getAttribute('aria-label');
    await user.click(add);
    await user.keyboard('Draft{Enter}');
    expect(saved().tasks[0].title).toBe('Draft');
    await user.keyboard('{Escape}');
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

  it('follows a task saved into another week and focuses it there', async () => {
    const user = await openFridayTask();
    await user.click(quickDate('Next Monday'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0].date).toBe('2026-10-05');
    const monday = screen.getByRole('region', { name: label(5) });
    expect(screen.queryByRole('region', { name: label(2) })).toBeNull();
    expect(
      within(screen.getByRole('navigation', { name: 'Choose day' }))
        .getByRole('button', { name: label(5) })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(monday.contains(document.activeElement)).toBe(true);
    expect(focusedTitle()).toBe('Friday task');
  });
  it('reveals a hidden weekend when a task is saved to Saturday', async () => {
    const user = await openFridayTask();
    expect(screen.queryByRole('region', { name: label(3) })).toBeNull();
    fireEvent.input(screen.getByLabelText(/Plan for/), {
      target: { value: '2026-10-03' },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0].date).toBe('2026-10-03');
    expect(
      (screen.getByRole('checkbox', { name: /Weekends/ }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    const saturday = screen.getByRole('region', { name: label(3) });
    expect(
      within(screen.getByRole('navigation', { name: 'Choose day' }))
        .getByRole('button', { name: label(3) })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(saturday.contains(document.activeElement)).toBe(true);
    expect(focusedTitle()).toBe('Friday task');
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
  it('saves separate weekly outcomes and preserves them across reloads', async () => {
    const app = render(<App />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("This week's outcome"),
      'Publish pricing page',
    );
    await user.click(screen.getByRole('button', { name: 'Save outcome' }));
    await user.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByLabelText("This week's outcome")).toHaveProperty(
      'value',
      '',
    );
    await user.type(
      screen.getByLabelText("This week's outcome"),
      'Talk to five customers',
    );
    await user.click(screen.getByRole('button', { name: 'Save outcome' }));
    expect(Object.values(saved().outcomes!)).toEqual([
      'Publish pricing page',
      'Talk to five customers',
    ]);
    app.unmount();
    render(<App />);
    expect(screen.getByLabelText("This week's outcome")).toHaveProperty(
      'value',
      'Publish pricing page',
    );
  });
  it('links a task, reloads an active session, stops early and records useful progress', async () => {
    const app = render(<App />);
    const user = await capture('Write pricing');
    await user.type(
      screen.getByLabelText("This week's outcome"),
      'Launch pricing',
    );
    await user.click(screen.getByRole('button', { name: 'Save outcome' }));
    await user.click(
      screen.getByRole('button', { name: 'Write pricing', exact: true }),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Next step Optional' }),
      'Draft three options',
    );
    await user.selectOptions(
      screen.getByLabelText('Weekly outcome'),
      Object.keys(saved().outcomes!)[0],
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await user.click(
      screen.getByRole('button', { name: 'Write pricing', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Start focus' }));
    await user.click(screen.getByRole('button', { name: 'Begin session' }));
    expect(saved().focus?.duration).toBe(25);
    app.unmount();
    render(<App />);
    expect(screen.getByLabelText('Time remaining')).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Stop and record progress' }),
    );
    expect(
      screen.getByRole('button', { name: 'Save progress' }),
    ).toHaveProperty('disabled', true);
    await user.type(
      screen.getByLabelText('What moved forward?'),
      'Drafted three options',
    );
    await user.clear(screen.getByLabelText('Next step'));
    await user.type(
      screen.getByLabelText('Next step'),
      'Validate with a customer',
    );
    await user.click(screen.getByRole('button', { name: 'Save progress' }));
    expect(saved().focus).toBeNull();
    expect(saved().tasks[0]).toMatchObject({
      nextStep: 'Validate with a customer',
      completed: false,
    });
    expect(saved().tasks[0].sessions?.[0].progress).toBe(
      'Drafted three options',
    );
    await user.click(
      screen.getByRole('button', { name: 'Write pricing', exact: true }),
    );
    expect(
      screen.getByRole('region', { name: 'Progress history' }).textContent,
    ).toContain('Drafted three options');
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
    await user.type(
      screen.getByLabelText('What moved forward?'),
      'Sent the proposal',
    );
    await user.click(screen.getByLabelText('Task complete'));
    await user.click(screen.getByRole('button', { name: 'Save progress' }));
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
      { id: 'p', title: 'Draft pricing' },
      { id: 'q', title: 'Other task' },
    ]);
    render(<App />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("This week's outcome"),
      'Launch pricing{Enter}',
    );
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
    await user.click(
      within(panel()).getByRole('checkbox', { name: /Link to/ }),
    );
    await user.click(screen.getByRole('button', { name: 'Begin session' }));
    expect(saved().focus).toMatchObject({ taskId: 'p', duration: 40 });
    expect(saved().tasks[0]).toMatchObject({
      nextStep: 'Write three options',
      outcomeWeek: Object.keys(saved().outcomes!)[0],
    });
    expect(document.activeElement).toBe(panel());
    expect(panel().textContent).toContain('Launch pricing');
    expect(screen.getByText('In focus')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Focus on/ })).toBeNull();

    await user.click(
      screen.getByRole('button', { name: 'Stop and record progress' }),
    );
    expect(document.activeElement).toBe(
      screen.getByLabelText('What moved forward?'),
    );
    await user.keyboard('Wrote two of three options');
    await user.click(screen.getByRole('button', { name: 'Save progress' }));
    expect(saved().focus).toBeNull();
    expect(saved().tasks[0].sessions?.[0].progress).toBe(
      'Wrote two of three options',
    );
    expect(screen.queryByRole('region', { name: 'Focus session' })).toBeNull();
    expect(document.activeElement).toBe(title('Draft pricing'));
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
    expect(document.activeElement).toBe(title('Plan sprint'));
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
    expect(screen.queryByRole('dialog')).toBeNull();
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
      const capture = screen.getByRole('textbox', {
        name: 'New task for unscheduled',
      });
      capture.focus();
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByLabelText('What moved forward?')).toBeTruthy();
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
  await user.click(
    screen.getByRole('button', { name: 'Stop and record progress' }),
  );
  expect(screen.getByRole('textbox', { name: 'Next step' })).toHaveProperty(
    'value',
    'Review new outline',
  );
  await user.type(
    screen.getByLabelText('What moved forward?'),
    'Outline drafted',
  );
  await user.click(screen.getByRole('button', { name: 'Save progress' }));
  expect(saved().tasks[0].nextStep).toBe('Review new outline');
});

it('keeps board completion made while reviewing a focus session', async () => {
  stored([{ id: 'review-complete', title: 'Send offer' }]);
  render(<App />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Focus on Send offer' }));
  await user.click(screen.getByRole('button', { name: 'Begin session' }));
  await user.click(
    screen.getByRole('button', { name: 'Stop and record progress' }),
  );
  await user.click(screen.getByRole('button', { name: 'Complete Send offer' }));
  expect(screen.getByLabelText('Task complete')).toHaveProperty(
    'checked',
    true,
  );
  await user.type(screen.getByLabelText('What moved forward?'), 'Sent offer');
  await user.click(screen.getByRole('button', { name: 'Save progress' }));
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
  await user.click(
    screen.getByRole('button', { name: 'Stop and record progress' }),
  );
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
  await user.type(
    screen.getByLabelText('What moved forward?'),
    'Offer refined',
  );
  await user.click(screen.getByRole('button', { name: 'Save progress' }));
  expect(saved().tasks[0].nextStep).toBe('Explicit review step');
});
