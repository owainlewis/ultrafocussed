import React from 'react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { weeklyScore } from '../src/Dashboard';
import {
  addDays,
  createTask,
  dateKey,
  parseDate,
  STORAGE_KEY,
  weekStart,
  type PlannerState,
} from '../src/model';

const today = dateKey(new Date());
const week = dateKey(weekStart(parseDate(today)));
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open');
    },
  });
});
afterEach(cleanup);
function fixture() {
  const previousDay = dateKey(addDays(parseDate(week), -1));
  const task = createTask('Management course', null);
  const state: PlannerState = {
    version: 1,
    tasks: [task],
    dailyPlans: { [week]: [], [previousDay]: [] },
  };
  for (const [day, count] of [
    [week, 4],
    [previousDay, 2],
  ] as const)
    for (let index = 0; index < count; index++) {
      const id = `${day}-${index}`;
      state.dailyPlans![day].push({ id, taskId: task.id });
      task.sessions = [
        ...(task.sessions ?? []),
        {
          id,
          blockId: id,
          planDate: day,
          startedAt: index * 3600000,
          endedAt: (index + 1) * 3600000,
          minutes: 60,
          progress: `Finished lesson ${index + 1}`,
          intent: `Write lesson ${index + 1}`,
        },
      ];
    }
  return state;
}
it('uses Monday–Sunday and the Plan score, excluding partial and duplicate hours', () => {
  const state = fixture();
  state.tasks[0].sessions!.push({ ...state.tasks[0].sessions![0] });
  state.dailyPlans![week].push({ id: 'partial', taskId: state.tasks[0].id });
  state.tasks[0].sessions!.push({
    id: 'partial',
    blockId: 'partial',
    planDate: week,
    startedAt: 0,
    endedAt: 600000,
    minutes: 10,
    progress: 'Started',
  });
  const score = weeklyScore(state, week);
  expect(score.days).toHaveLength(7);
  expect(score.days[0].day).toBe(week);
  expect(score.days[6].day).toBe(dateKey(addDays(parseDate(week), 6)));
  expect(score.hours).toBe(4);
  expect(score.goalDays).toBe(1);
  expect(score.workforms).toHaveLength(4);
  expect(weeklyScore(state, dateKey(addDays(parseDate(week), -7))).hours).toBe(
    2,
  );
});
it('opens on Dashboard, reviews workforms and previous weeks, and keeps Plan accessible', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture()));
  const user = userEvent.setup();
  let app = render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeTruthy();
  expect(screen.getByText('2h ahead of last week')).toBeTruthy();
  expect(
    screen.getAllByRole('button', { name: /Read workform:/ }),
  ).toHaveLength(4);
  await user.click(
    screen.getByRole('button', { name: 'Read workform: Write lesson 1' }),
  );
  expect(
    within(screen.getByRole('dialog')).getByText('Finished lesson 1'),
  ).toBeTruthy();
  await user.click(
    screen.getByRole('button', { name: 'Close workform', exact: true }),
  );
  await user.click(screen.getByRole('button', { name: 'Previous week' }));
  expect(
    screen.getAllByRole('button', { name: /Read workform:/ }),
  ).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'This week' }));
  await user.click(screen.getByRole('button', { name: 'Plan your day' }));
  expect(
    screen.getByRole('heading', { name: 'Plan', exact: true }),
  ).toBeTruthy();
  app.unmount();
  app = render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeTruthy();
  expect(
    screen.getAllByRole('button', { name: /Read workform:/ }),
  ).toHaveLength(4);
});
it('has an honest empty score and directs the user to Plan', () => {
  render(<App />);
  expect(
    screen.getByText('No completed hours recorded this week.'),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Go to Plan' }));
  expect(
    screen.getByRole('heading', { name: 'Plan', exact: true }),
  ).toBeTruthy();
});
