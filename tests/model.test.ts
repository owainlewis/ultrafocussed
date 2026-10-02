import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  createTask,
  dateKey,
  decodeState,
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
  assert.deepEqual(decodeState(null), { version: 1, tasks: [] });
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
