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
  monthDays,
  monthStart,
  addMonths,
  removeGoal,
  removeProject,
  planForDay,
  completedBlocks,
  startChecklistWeek,
  toggleRoutineDay,
  remainingSeconds,
  finishFocus,
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

test('focus time follows wall clock and records actual early-stop time only once', () => {
  const focus = {
    taskId: 'a',
    startedAt: 100000,
    duration: 25,
    stoppedAt: 160000,
  };
  assert.equal(
    remainingSeconds({ ...focus, stoppedAt: undefined }, 130000),
    1470,
  );
  assert.equal(remainingSeconds(focus, 9999999), 1440);
  const state = { version: 1 as const, tasks: [task('a')], focus };
  const finished = finishFocus(
    state,
    ' Drafted outline ',
    false,
    ' Review outline ',
    9999999,
  );
  assert.equal(finished.tasks[0].sessions?.[0].minutes, 1);
  assert.equal(finished.tasks[0].nextStep, 'Review outline');
  assert.deepEqual(finishFocus(finished, 'again', true, '', 9999999), finished);
  assert.deepEqual(decodeState(JSON.stringify(finished)), finished);
});
test('invalid new data is rejected while old backups remain valid', () => {
  const state = { version: 1, tasks: [task('a')] };
  for (const extra of [
    { outcomes: { '2026-10-13': 'wrong day' } },
    { focus: { taskId: 'missing', startedAt: 1, duration: 25 } },
    { focus: { taskId: 'a', startedAt: 1, duration: 0 } },
  ])
    assert.throws(() => decodeState(JSON.stringify({ ...state, ...extra })));
  assert.throws(() =>
    decodeState(
      JSON.stringify({
        ...state,
        tasks: [
          {
            ...task('a'),
            sessions: [
              {
                id: 'x',
                startedAt: 2,
                endedAt: 1,
                minutes: 1,
                progress: 'done',
              },
            ],
          },
        ],
      }),
    ),
  );
  assert.deepEqual(decodeState(JSON.stringify(state)), state);
});

test('blank session updates and task progress notes round-trip in backups', () => {
  const state = {
    version: 1 as const,
    tasks: [{ ...task('a'), progressNotes: 'Reviewed draft' }],
    focus: { taskId: 'a', startedAt: 100000, duration: 60 },
  };
  const finished = finishFocus(state, '', false, 'Send draft', 160000);
  assert.equal(finished.focus, null);
  assert.equal(finished.tasks[0].sessions?.[0].progress, '');
  assert.deepEqual(decodeState(JSON.stringify(finished)), finished);
  assert.throws(() =>
    decodeState(
      JSON.stringify({
        ...state,
        tasks: [{ ...task('a'), progressNotes: 123 }],
      }),
    ),
  );
});

test('overlong task progress notes are rejected', () => {
  assert.throws(() =>
    decodeState(
      JSON.stringify({
        version: 1,
        tasks: [{ ...task('a'), progressNotes: 'x'.repeat(10001) }],
      }),
    ),
  );
});

test('month grids align to Monday and handle leap years and year boundaries', () => {
  const leap = monthDays(parseDate('2024-02-15'));
  assert.equal(leap.length % 7, 0);
  assert.equal(leap[0].getDay(), 1);
  assert.equal(leap.filter((day) => day.getMonth() === 1).length, 29);
  assert.equal(monthDays(parseDate('2021-02-15')).length, 28);
  assert.equal(dateKey(monthStart(parseDate('2026-10-31'))), '2026-10-01');
  assert.equal(dateKey(addMonths(parseDate('2026-12-31'), 1)), '2027-01-01');
});

test('goals share task identity, round-trip, and unlink without deleting actions', () => {
  const state = {
    version: 1 as const,
    goals: [{ id: 'goal', title: 'Publish course', year: 2026 }],
    tasks: [{ ...task('action'), goalId: 'goal' }],
  };
  assert.deepEqual(decodeState(JSON.stringify(state)), state);
  const removed = removeGoal(state, 'goal');
  assert.equal(removed.tasks[0].id, 'action');
  assert.equal(removed.tasks[0].date, state.tasks[0].date);
  assert.equal(removed.tasks[0].goalId, null);
  assert.deepEqual(decodeState(JSON.stringify(removed)), removed);
  assert.throws(() => decodeState(JSON.stringify({ ...state, goals: [] })));
  assert.throws(() =>
    decodeState(
      JSON.stringify({
        ...state,
        goals: Array.from({ length: 5 }, (_, i) => ({
          id: `g${i}`,
          title: `Goal ${i}`,
          year: 2026,
        })),
        tasks: [],
      }),
    ),
  );
  assert.throws(() =>
    decodeState(
      JSON.stringify({
        ...state,
        goals: [{ id: 'goal', title: '', year: 2026 }],
      }),
    ),
  );
  assert.throws(() =>
    decodeState(
      JSON.stringify({
        ...state,
        goals: [{ id: 'goal', title: 'Goal', year: '2026' }],
      }),
    ),
  );
  assert.deepEqual(
    decodeState(JSON.stringify({ version: 1, tasks: [task('old')] })).tasks,
    [task('old')],
  );
});

test('a stale setup clock or a backwards clock change cannot extend the countdown', () => {
  const session = { taskId: 'a', startedAt: 120000, duration: 60 };
  assert.equal(remainingSeconds(session, 115000), 3600);
  assert.equal(remainingSeconds(session, 121500), 3599);
  assert.equal(remainingSeconds(session, 3720000), 0);
});

test('project links round-trip and removal preserves the shared task and goal', () => {
  const state = {
    version: 1 as const,
    projects: [{ id: 'p', title: 'Client work', completed: false }],
    goals: [{ id: 'g', title: 'Teach', year: 2026 }],
    tasks: [{ ...task('a'), projectId: 'p', goalId: 'g', notes: 'Preserve' }],
  };
  assert.deepEqual(decodeState(JSON.stringify(state)), state);
  const removed = removeProject(state, 'p');
  assert.deepEqual(removed.tasks, [{ ...state.tasks[0], projectId: null }]);
  assert.deepEqual(decodeState(JSON.stringify(removed)), removed);
  for (const projects of [
    [],
    [...state.projects, ...state.projects],
    [{ ...state.projects[0], completed: 'yes' }],
    [{ ...state.projects[0], title: '' }],
  ]) {
    assert.throws(() => decodeState(JSON.stringify({ ...state, projects })));
  }
});

test('weekly checklists use dated shared tasks and keep snapshots', () => {
  const routine = { id: 'r', title: 'Gym', target: 3, daily: false };
  const original = { version: 1 as const, tasks: [], routines: [routine] };
  const first = startChecklistWeek(original, '2026-10-12');
  assert.deepEqual(first.routineWeeks?.['2026-10-12'], [routine]);
  assert.equal(startChecklistWeek(first, '2026-10-12'), first);
  const checked = toggleRoutineDay(first, routine, '2026-10-13');
  assert.equal(checked.tasks[0].completed, true);
  const unchecked = toggleRoutineDay(checked, routine, '2026-10-13');
  assert.equal(unchecked.tasks.length, 1);
  assert.equal(unchecked.tasks[0].id, checked.tasks[0].id);
  assert.equal(unchecked.tasks[0].completed, false);
  const next = startChecklistWeek(
    { ...checked, routines: [{ ...routine, target: 4 }] },
    '2026-10-19',
  );
  assert.equal(next.routineWeeks?.['2026-10-12'][0].target, 3);
  assert.equal(next.routineWeeks?.['2026-10-19'][0].target, 4);
  assert.deepEqual(decodeState(JSON.stringify(next)), next);
  for (const target of [0, 8, 1.5])
    assert.throws(() =>
      decodeState(
        JSON.stringify({ ...original, routines: [{ ...routine, target }] }),
      ),
    );
  assert.throws(() =>
    decodeState(
      JSON.stringify({ ...first, routineWeeks: { '2026-10-13': [routine] } }),
    ),
  );
  assert.throws(() =>
    decodeState(JSON.stringify({ ...checked, routines: [] })),
  );
});

test('daily blocks share tasks, preserve workforms and count only full submitted hours once', () => {
  const day = '2026-10-17';
  const initial = { version: 1 as const, tasks: [task('a', null)] };
  const blocks = planForDay(initial, day);
  assert.equal(blocks.length, 4);
  const state = {
    ...initial,
    dailyPlans: { [day]: blocks },
    focus: {
      taskId: 'a',
      startedAt: 1000,
      duration: 60,
      planDate: day,
      blockId: blocks[0].id,
      workform: 'Draft',
    },
  };
  assert.deepEqual(decodeState(JSON.stringify(state)), state);
  const full = finishFocus(state, 'Wrote the outline', false, '', 3601000);
  assert.equal(completedBlocks(full, day), 1);
  assert.equal(full.tasks[0].completed, false);
  assert.equal(full.tasks[0].date, null);
  assert.deepEqual(decodeState(JSON.stringify(full)), full);
  assert.equal(
    completedBlocks(
      {
        ...full,
        tasks: [
          {
            ...full.tasks[0],
            sessions: [...full.tasks[0].sessions!, ...full.tasks[0].sessions!],
          },
        ],
      },
      day,
    ),
    1,
  );
  const partial = finishFocus(
    { ...state, focus: { ...state.focus, stoppedAt: 601000 } },
    'Started outline',
    false,
    '',
    3601000,
  );
  assert.equal(completedBlocks(partial, day), 0);
  assert.equal(partial.tasks[0].sessions![0].minutes, 10);
  assert.throws(() =>
    decodeState(
      JSON.stringify({ ...state, focus: { ...state.focus, duration: 30 } }),
    ),
  );
  assert.throws(() =>
    decodeState(
      JSON.stringify({
        ...state,
        dailyPlans: { [day]: [{ ...blocks[0], time: '23:30' }] },
      }),
    ),
  );
});
