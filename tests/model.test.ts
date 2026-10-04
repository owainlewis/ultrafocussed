import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addMonths,
  createTask,
  dateKey,
  decodeState,
  monthDays,
  moveTask,
  parseDate,
  updateTask,
  validDate,
  weekStart,
  type Task,
} from '../src/model.ts';
const task = (
  id: string,
  date: string | null = '2026-10-01',
  main = false,
): Task => ({ id, title: id, date, main, notes: '', completed: false });

test('captured tasks round-trip through saved state with notes and completion', () => {
  const captured = createTask('  Write an outline  ', null);
  const edited = updateTask([captured], captured.id, {
    date: '2026-10-02',
    notes: 'Review with Sam',
    completed: true,
    main: true,
  });
  const restored = decodeState(JSON.stringify({ version: 1, tasks: edited }));
  assert.equal(restored.tasks[0].title, 'Write an outline');
  assert.equal(restored.tasks[0].date, '2026-10-02');
  assert.equal(restored.tasks[0].notes, 'Review with Sam');
  assert.equal(restored.tasks[0].completed, true);
  assert.equal(restored.tasks[0].main, true);
});
test('week navigation uses Monday and survives month, year, and daylight-saving boundaries', () => {
  assert.equal(dateKey(weekStart(parseDate('2026-10-04'))), '2026-09-28');
  assert.equal(
    dateKey(addDays(weekStart(parseDate('2027-01-01')), 7)),
    '2027-01-04',
  );
  assert.equal(dateKey(addDays(parseDate('2026-10-24'), 2)), '2026-10-26');
  assert.equal(dateKey(parseDate('0099-01-01')), '0099-01-01');
});
test('month grids hold every date in whole Monday-first weeks', () => {
  const span = (key: string) => {
    const days = monthDays(parseDate(key)).map(dateKey);
    return [days.length, days[0], days[days.length - 1]];
  };
  // Starts on a Thursday.
  assert.deepEqual(span('2026-10-17'), [35, '2026-09-28', '2026-11-01']);
  // Starts on Monday and ends on Sunday: no padding.
  assert.deepEqual(span('2027-02-10'), [28, '2027-02-01', '2027-02-28']);
  // Starts on Saturday with 31 days: six weeks.
  assert.deepEqual(span('2026-08-01'), [42, '2026-07-27', '2026-09-06']);
  // Leap February.
  assert.deepEqual(span('2028-02-29'), [35, '2028-01-31', '2028-03-05']);
  // The daylight-saving change on 29 March neither skips nor repeats a date.
  const march = monthDays(parseDate('2026-03-01')).map(dateKey);
  assert.equal(new Set(march).size, march.length);
  assert.deepEqual(march.slice(-8, -6), ['2026-03-29', '2026-03-30']);
});
test('month navigation keeps the day of the month where it exists', () => {
  const step = (key: string, months: number) =>
    dateKey(addMonths(parseDate(key), months));
  assert.equal(step('2026-01-31', 1), '2026-02-28');
  assert.equal(step('2028-01-31', 1), '2028-02-29');
  assert.equal(step('2026-03-31', -1), '2026-02-28');
  assert.equal(step('2026-12-15', 1), '2027-01-15');
  assert.equal(step('2027-01-04', -1), '2026-12-04');
});
test('moving tasks changes their day and order without duplicating or losing work', () => {
  const tasks = [task('a'), task('b', null), task('c')];
  const moved = moveTask(tasks, 'b', '2026-10-01', 'c');
  assert.deepEqual(
    moved.map((item) => item.id),
    ['a', 'b', 'c'],
  );
  assert.equal(moved[1].date, '2026-10-01');
  const reordered = moveTask(moved, 'c', '2026-10-01', 'a');
  assert.deepEqual(
    reordered.map((item) => item.id),
    ['c', 'a', 'b'],
  );
  assert.deepEqual(moveTask(reordered, 'missing', null), reordered);
  assert.deepEqual(moveTask(reordered, 'a', '2026-10-01', 'a'), reordered);
});
test('one main outcome per day, and moving to unscheduled clears its main status', () => {
  const tasks = updateTask([task('a', '2026-10-01', true), task('b')], 'b', {
    main: true,
  });
  assert.equal(tasks[0].main, false);
  assert.equal(tasks[1].main, true);
  assert.equal(
    moveTask(tasks, 'b', null).find((item) => item.id === 'b')?.main,
    false,
  );
});
test('moving a main outcome preserves the destination day’s existing choice', () => {
  const moved = moveTask(
    [task('a', '2026-10-01', true), task('b', '2026-10-02', true)],
    'a',
    '2026-10-02',
  );
  assert.equal(moved.find((item) => item.id === 'a')?.main, false);
  assert.equal(moved.find((item) => item.id === 'b')?.main, true);
});
test('unscheduled and earlier unfinished tasks are not automatically rolled forward', () => {
  const tasks = [
    task('old', '2026-09-01'),
    task('later', '2026-11-01'),
    task('inbox', null),
  ];
  const updated = updateTask(tasks, 'later', { completed: true });
  assert.equal(updated[0].date, '2026-09-01');
  assert.equal(updated[2].date, null);
  assert.equal(
    updateTask(updated, 'later', { completed: false })[1].completed,
    false,
  );
});
test('malformed or incompatible data is rejected instead of silently replaced', () => {
  assert.deepEqual(decodeState(null), { version: 2, tasks: [], goals: [] });
  for (const raw of [
    '{bad',
    '{"version":2,"tasks":[]}',
    '{"version":1,"tasks":null}',
    JSON.stringify({ version: 1, tasks: [task('a'), task('a')] }),
    JSON.stringify({
      version: 1,
      tasks: [{ ...task('a'), date: '2026-02-30' }],
    }),
    JSON.stringify({ version: 1, tasks: [task('a', null, true)] }),
    JSON.stringify({
      version: 1,
      tasks: [task('a', '2026-10-01', true), task('b', '2026-10-01', true)],
    }),
  ])
    assert.throws(() => decodeState(raw));
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('2026-02-29'), false);
});

const goal = {
  id: 'goal-1',
  title: 'Grow the audience',
  reason: 'Build the business',
  targetDate: '2027-10-04',
  focus: 'Publish weekly',
  completed: false,
};
test('legacy backups migrate without changing tasks', () => {
  const oldTasks = [task('old')];
  assert.deepEqual(
    decodeState(JSON.stringify({ version: 1, tasks: oldTasks })),
    { version: 2, tasks: oldTasks, goals: [] },
  );
});
test('goal links survive scheduling, completion, and backup restore', () => {
  const linked = { ...task('video'), goalId: goal.id };
  const tasks = updateTask(
    moveTask([linked], linked.id, '2026-10-05'),
    linked.id,
    { completed: true },
  );
  const restored = decodeState(
    JSON.stringify({ version: 2, goals: [goal], tasks }),
  );
  assert.deepEqual(restored.goals, [goal]);
  assert.equal(restored.tasks[0].goalId, goal.id);
  assert.equal(restored.tasks[0].date, '2026-10-05');
  assert.equal(restored.tasks[0].completed, true);
});
test('invalid goals and dangling links are rejected', () => {
  for (const goals of [
    null,
    [goal, goal],
    [{ ...goal, targetDate: '2026-02-30' }],
    [{ ...goal, title: ' ' }],
  ]) {
    assert.throws(() =>
      decodeState(JSON.stringify({ version: 2, goals, tasks: [] })),
    );
  }
  assert.throws(() =>
    decodeState(
      JSON.stringify({
        version: 2,
        goals: [],
        tasks: [{ ...task('a'), goalId: 'missing' }],
      }),
    ),
  );
});
