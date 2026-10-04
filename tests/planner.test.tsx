import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
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

it('captures and edits a goal, links a daily task, and restores both after reload', async () => {
  const app = render(<App />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add goal' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Outcome' }),
    'Grow my list',
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Why it matters' }),
    'Reach the right people',
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Next 90 days' }),
    'Publish useful videos',
  );
  fireEvent.change(screen.getByLabelText('Target date'), {
    target: { value: '2027-10-04' },
  });
  await user.click(screen.getByRole('button', { name: 'Save goal' }));
  await capture('Publish a video');
  await user.click(
    screen.getByRole('button', { name: 'Publish a video', exact: true }),
  );
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Goal', exact: true }),
    saved().goals[0].id,
  );
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Today',
      exact: true,
    }),
  );
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(saved().tasks[0]).toMatchObject({
    goalId: saved().goals[0].id,
    date: today,
  });
  app.unmount();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /^Goals/ }));
  await user.click(
    screen.getByRole('button', { name: /Grow my list.*Target/ }),
  );
  expect(
    screen.getByRole('textbox', { name: 'Why it matters' }),
  ).toHaveProperty('value', 'Reach the right people');
  await user.clear(screen.getByRole('textbox', { name: 'Outcome' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Outcome' }),
    'Grow a useful audience',
  );
  await user.click(screen.getByRole('checkbox', { name: 'Goal completed' }));
  await user.click(screen.getByRole('button', { name: 'Save goal' }));
  expect(saved().goals[0]).toMatchObject({
    title: 'Grow a useful audience',
    completed: true,
    targetDate: '2027-10-04',
  });
  expect(
    screen
      .getByRole('button', { name: 'Publish a video', exact: true })
      .closest('li')?.textContent,
  ).toContain('Grow a useful audience');
  await user.click(
    screen.getByRole('button', { name: 'Publish a video', exact: true }),
  );
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Goal', exact: true }),
    '',
  );
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(saved().tasks[0].goalId).toBeNull();
});

it('closes a stale goal draft when another tab updates the planner', async () => {
  const goal = {
    id: 'g',
    title: 'Audience',
    reason: 'Original reason',
    targetDate: null,
    focus: 'Weekly videos',
    completed: false,
  };
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 2, tasks: [], goals: [goal] }),
  );
  render(<App />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /^Goals/ }));
  await user.click(
    screen.getByRole('button', { name: /Audience No target date/ }),
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Why it matters' }),
    ' unsaved draft',
  );
  const newValue = JSON.stringify({
    version: 2,
    tasks: [],
    goals: [{ ...goal, reason: 'Newer reason', title: 'Updated audience' }],
  });
  fireEvent(
    window,
    new StorageEvent('storage', { key: STORAGE_KEY, newValue }),
  );
  expect(screen.queryByRole('dialog', { name: 'Goal details' })).toBeNull();
  await user.click(
    screen.getByRole('button', { name: /Updated audience No target date/ }),
  );
  expect(
    screen.getByRole('textbox', { name: 'Why it matters' }),
  ).toHaveProperty('value', 'Newer reason');
});

describe('month view', () => {
  // Friday 2 October 2026, with weekends hidden in the week view.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 2, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (window as { matchMedia?: unknown }).matchMedia;
  });
  const label = (day: number, month = 9) => {
    const date = new Date(2026, month, day, 12);
    return `${new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date)} ${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date)}`;
  };
  const monthHeading = (month: number) =>
    new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(new Date(2026, month, 1, 12));
  const viewButton = (name: string) =>
    within(screen.getByRole('group', { name: 'View' })).getByRole('button', {
      name,
    });
  const heading = () => screen.getByRole('heading', { level: 1 }).textContent;
  const calendar = () => screen.getByRole('region', { name: / calendar$/ });
  const cell = (day: number, month = 9) =>
    within(calendar()).getByRole('region', { name: label(day, month) });
  const title = (container: HTMLElement, name: string) =>
    within(container).getByRole('button', { name, exact: true });

  it('switches with a labelled toggle and shows every date of the month', async () => {
    render(<App />);
    const user = userEvent.setup();
    expect(viewButton('Week').getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('region', { name: label(3) })).toBeNull();
    viewButton('Month').focus();
    await user.keyboard('{Enter}');
    expect(viewButton('Month').getAttribute('aria-pressed')).toBe('true');
    expect(viewButton('Week').getAttribute('aria-pressed')).toBe('false');
    expect(heading()).toBe(monthHeading(9));
    // Monday 28 September to Sunday 1 November, weekends included.
    const cells = within(calendar()).getAllByRole('region');
    expect(cells).toHaveLength(35);
    expect(cells[0].getAttribute('aria-label')).toBe(label(28, 8));
    expect(cells[34].getAttribute('aria-label')).toBe(label(1, 10));
    expect(cell(3)).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Weekends/ })).toBeNull();
    expect(
      within(cell(2))
        .getByRole('button', { name: `${label(2)}, today` })
        .getAttribute('aria-pressed'),
    ).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(heading()).toBe(monthHeading(8));
    expect(within(calendar()).getAllByRole('region')).toHaveLength(35);
    expect(
      within(cell(2, 8))
        .getByRole('button', { name: label(2, 8) })
        .getAttribute('aria-pressed'),
    ).toBe('true');

    // A selected Saturday stays selected in the week view.
    await user.click(
      within(cell(5, 8)).getByRole('button', { name: label(5, 8) }),
    );
    await user.click(viewButton('Week'));
    expect(heading()).toBe(
      new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).formatRange(new Date(2026, 7, 31, 12), new Date(2026, 8, 6, 12)),
    );
    expect(
      (screen.getByRole('checkbox', { name: /Weekends/ }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      within(screen.getByRole('navigation', { name: 'Choose day' }))
        .getByRole('button', { name: label(5, 8) })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('shares one task record between the month and week views', async () => {
    stored([{ id: 'w', title: 'Weekend review', date: '2026-10-03' }]);
    render(<App />);
    const user = userEvent.setup();
    expect(screen.getByRole('checkbox', { name: 'Weekends (1)' })).toBeTruthy();
    await user.click(viewButton('Month'));
    await user.click(
      within(cell(3)).getByRole('button', { name: 'Complete Weekend review' }),
    );
    await user.click(
      within(cell(4)).getByRole('button', { name: /^Add task to/ }),
    );
    await user.keyboard('Plan the week{Enter}{Escape}');
    expect(
      saved().tasks.map((task) => [task.title, task.date, task.completed]),
    ).toEqual([
      ['Weekend review', '2026-10-03', true],
      ['Plan the week', '2026-10-04', false],
    ]);

    await user.click(title(cell(4), 'Plan the week'));
    await user.click(
      within(screen.getByRole('group', { name: 'Quick dates' })).getByRole(
        'button',
        { name: 'Next Monday' },
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(heading()).toBe(monthHeading(9));
    expect(cell(5).contains(document.activeElement)).toBe(true);
    expect(
      within(cell(4)).queryByRole('button', { name: 'Plan the week' }),
    ).toBeNull();

    await user.click(viewButton('Week'));
    expect(
      title(screen.getByRole('region', { name: label(5) }), 'Plan the week'),
    ).toBeTruthy();
    expect(saved().tasks).toHaveLength(2);
  });

  it('follows a task moved across a month boundary with the keyboard', async () => {
    stored([
      { id: 'a', title: 'Month end', date: '2026-10-31' },
      { id: 'b', title: 'Also month end', date: '2026-10-31' },
    ]);
    render(<App />);
    const user = userEvent.setup();
    await user.click(viewButton('Month'));
    title(cell(31), 'Also month end').focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(saved().tasks.map((task) => task.id)).toEqual(['b', 'a']);
    const moved = () => saved().tasks.find((task) => task.id === 'b')?.date;
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(moved()).toBe('2026-11-01');
    expect(heading()).toBe(monthHeading(10));
    expect(cell(1, 10).contains(document.activeElement)).toBe(true);
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    expect(moved()).toBe('2026-10-31');
    expect(heading()).toBe(monthHeading(9));
    expect(document.activeElement?.textContent).toBe('Also month end');
  });

  it('lists goals with their 90-day focus and opens linked tasks', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        goals: [
          {
            id: 'g',
            title: 'Grow my list',
            reason: '',
            targetDate: '2027-10-04',
            focus: 'Publish weekly videos',
            completed: false,
          },
        ],
        tasks: [
          ['t', 'Script video', '2026-10-06', false],
          ['u', 'Pick topics', null, false],
          ['d', 'Old video', '2026-10-01', true],
        ].map(([id, title, date, completed]) => ({
          id,
          title,
          date,
          completed,
          goalId: 'g',
          notes: '',
          main: false,
        })),
      }),
    );
    render(<App />);
    const user = userEvent.setup();
    await user.click(viewButton('Month'));
    expect(screen.queryByRole('region', { name: 'Your goals' })).toBeNull();
    const goals = screen.getByRole('complementary', { name: /^Goals/ });
    expect(within(goals).getByText('Publish weekly videos')).toBeTruthy();
    const linked = () =>
      within(goals).getByRole('list', { name: 'Open tasks for Grow my list' });
    expect(
      within(linked())
        .getAllByRole('button')
        .map((button) => button.firstChild?.textContent),
    ).toEqual(['Script video', 'Pick topics']);
    expect(title(cell(6), 'Script video').closest('li')?.textContent).toContain(
      'Grow my list',
    );

    await user.click(within(linked()).getByRole('button', { name: /^Script/ }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Goal', exact: true }),
      '',
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saved().tasks[0].goalId).toBeNull();
    expect(within(linked()).getAllByRole('button')).toHaveLength(1);
    expect(
      title(cell(6), 'Script video').closest('li')?.textContent,
    ).not.toContain('Grow my list');

    await user.click(
      within(goals).getByRole('button', { name: /^Grow my list/ }),
    );
    const focus = screen.getByRole('textbox', { name: 'Next 90 days' });
    await user.clear(focus);
    await user.type(focus, 'Ship a video series');
    await user.click(screen.getByRole('button', { name: 'Save goal' }));
    expect(within(goals).getByText('Ship a video series')).toBeTruthy();
    expect(saved().goals[0].focus).toBe('Ship a video series');
  });

  it('shows a compact grid with the selected day below it on mobile', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (media: string) => ({
        matches: true,
        media,
        addEventListener() {},
        removeEventListener() {},
      }),
    });
    stored([{ id: 'm', title: 'Mobile task', date: '2026-10-09' }]);
    render(<App />);
    const user = userEvent.setup();
    await user.click(viewButton('Month'));
    expect(
      within(calendar()).queryByRole('button', { name: 'Mobile task' }),
    ).toBeNull();
    await user.click(
      within(calendar()).getByRole('button', { name: `${label(9)}, 1 open` }),
    );
    const day = () => screen.getByRole('region', { name: /^Tasks for / });
    expect(day().getAttribute('aria-label')).toBe(`Tasks for ${label(9)}`);
    title(day(), 'Mobile task').focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(saved().tasks[0].date).toBe('2026-10-10');
    expect(day().getAttribute('aria-label')).toBe(`Tasks for ${label(10)}`);
    expect(document.activeElement?.textContent).toBe('Mobile task');
    await user.click(within(day()).getByRole('button', { name: /^Add task/ }));
    await user.keyboard('Second task{Enter}');
    expect(saved().tasks[1]).toMatchObject({
      title: 'Second task',
      date: '2026-10-10',
    });
    expect(screen.getByRole('complementary', { name: /^Goals/ })).toBeTruthy();
  });
});
