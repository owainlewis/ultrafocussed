export type Task = {
  id: string;
  title: string;
  date: string | null;
  completed: boolean;
  notes: string;
  main: boolean;
  goalId?: string | null;
  projectId?: string | null;
  nextStep?: string;
  progressNotes?: string;
  outcomeWeek?: string | null;
  sessions?: FocusRecord[];
};
export type FocusRecord = {
  id: string;
  startedAt: number;
  endedAt: number;
  minutes: number;
  progress: string;
};
export type FocusSession = {
  taskId: string;
  startedAt: number;
  duration: number;
  stoppedAt?: number;
};
export type Goal = { id: string; title: string; year: number };
export type Project = { id: string; title: string; completed: boolean };
export type PlannerState = {
  version: 1;
  tasks: Task[];
  goals?: Goal[];
  projects?: Project[];
  outcomes?: Record<string, string>;
  focus?: FocusSession | null;
};
export const STORAGE_KEY = 'ultrafocussed.planner.v1';
export const emptyState = (): PlannerState => ({ version: 1, tasks: [] });

// Dates are local calendar dates, not UTC timestamps.
export function dateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date;
}
export function validDate(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    dateKey(parseDate(key)) === key
  );
}
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
export function weekStart(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}
export function decodeState(raw: string | null): PlannerState {
  if (raw === null) return emptyState();
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !Array.isArray(value.tasks))
    throw new Error('Unsupported planner data');
  const goalIds = new Set<string>();
  const goalCounts = new Map<number, number>();
  if (value.goals !== undefined && !Array.isArray(value.goals))
    throw new Error('Invalid goals');
  for (const goal of value.goals ?? []) {
    if (
      !goal ||
      typeof goal.id !== 'string' ||
      !goal.id ||
      goalIds.has(goal.id) ||
      typeof goal.title !== 'string' ||
      !goal.title.trim() ||
      goal.title.length > 200 ||
      !Number.isInteger(goal.year) ||
      goal.year < 1 ||
      goal.year > 9999
    )
      throw new Error('Invalid goal');
    goalIds.add(goal.id);
    const count = (goalCounts.get(goal.year) ?? 0) + 1;
    if (count > 4) throw new Error('At most four goals per year');
    goalCounts.set(goal.year, count);
  }
  const projectIds = new Set<string>();
  if (value.projects !== undefined && !Array.isArray(value.projects))
    throw new Error('Invalid projects');
  for (const project of value.projects ?? []) {
    if (
      !project ||
      typeof project.id !== 'string' ||
      !project.id ||
      projectIds.has(project.id) ||
      typeof project.title !== 'string' ||
      !project.title.trim() ||
      project.title.length > 200 ||
      typeof project.completed !== 'boolean'
    )
      throw new Error('Invalid project');
    projectIds.add(project.id);
  }
  const ids = new Set<string>();
  const mainDates = new Set<string>();
  for (const task of value.tasks) {
    if (
      task &&
      task.progressNotes !== undefined &&
      (typeof task.progressNotes !== 'string' ||
        task.progressNotes.length > 10000)
    )
      throw new Error('Invalid progress notes');
    if (
      !task ||
      (task.goalId != null &&
        (typeof task.goalId !== 'string' || !goalIds.has(task.goalId))) ||
      (task.projectId != null &&
        (typeof task.projectId !== 'string' ||
          !projectIds.has(task.projectId))) ||
      typeof task.id !== 'string' ||
      !task.id ||
      ids.has(task.id) ||
      typeof task.title !== 'string' ||
      !task.title.trim() ||
      task.title.length > 300 ||
      (task.date !== null && !validDate(task.date)) ||
      typeof task.completed !== 'boolean' ||
      typeof task.notes !== 'string' ||
      task.notes.length > 10000 ||
      typeof task.main !== 'boolean' ||
      (task.main && (task.date === null || mainDates.has(task.date)))
    )
      throw new Error('Invalid planner data');
    ids.add(task.id);
    if (task.main) mainDates.add(task.date);
  }
  if (
    value.outcomes !== undefined &&
    (value.outcomes === null ||
      typeof value.outcomes !== 'object' ||
      Array.isArray(value.outcomes) ||
      Object.entries(value.outcomes).some(
        ([key, text]) =>
          !validDate(key) ||
          dateKey(weekStart(parseDate(key))) !== key ||
          typeof text !== 'string' ||
          text.length > 500,
      ))
  )
    throw new Error('Invalid weekly outcomes');
  for (const task of value.tasks) {
    if (
      (task.nextStep !== undefined &&
        (typeof task.nextStep !== 'string' || task.nextStep.length > 500)) ||
      (task.outcomeWeek != null &&
        (!validDate(task.outcomeWeek) ||
          dateKey(weekStart(parseDate(task.outcomeWeek))) !== task.outcomeWeek))
    )
      throw new Error('Invalid task focus data');
    if (
      task.sessions !== undefined &&
      (!Array.isArray(task.sessions) ||
        task.sessions.some(
          (entry: FocusRecord) =>
            !entry ||
            typeof entry.id !== 'string' ||
            !Number.isFinite(entry.startedAt) ||
            !Number.isFinite(entry.endedAt) ||
            entry.endedAt < entry.startedAt ||
            !Number.isFinite(entry.minutes) ||
            entry.minutes < 0 ||
            typeof entry.progress !== 'string' ||
            entry.progress.length > 2000,
        ))
    )
      throw new Error('Invalid progress history');
  }
  const focus = value.focus;
  if (
    focus != null &&
    (!ids.has(focus.taskId) ||
      !Number.isFinite(focus.startedAt) ||
      !Number.isInteger(focus.duration) ||
      focus.duration < 1 ||
      focus.duration > 180 ||
      (focus.stoppedAt !== undefined &&
        (!Number.isFinite(focus.stoppedAt) ||
          focus.stoppedAt < focus.startedAt)))
  )
    throw new Error('Invalid focus session');
  return value;
}
export function createTask(title: string, date: string | null): Task {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    date,
    completed: false,
    notes: '',
    main: false,
  };
}
export function updateTask(
  tasks: Task[],
  id: string,
  patch: Partial<Omit<Task, 'id'>>,
): Task[] {
  const task = tasks.find((item) => item.id === id);
  if (!task) return tasks;
  const updated = { ...task, ...patch };
  if (updated.date === null) updated.main = false;
  // Moving a main task cannot silently replace another day's chosen outcome.
  if (
    updated.date !== task.date &&
    tasks.some(
      (item) => item.id !== id && item.date === updated.date && item.main,
    )
  )
    updated.main = false;
  return tasks.map((item) =>
    item.id === id
      ? updated
      : updated.main && item.date === updated.date
        ? { ...item, main: false }
        : item,
  );
}
export function moveTask(
  tasks: Task[],
  id: string,
  date: string | null,
  beforeId?: string,
): Task[] {
  const updated = updateTask(tasks, id, { date });
  const task = updated.find((item) => item.id === id);
  if (!task || beforeId === id) return updated;
  const rest = updated.filter((item) => item.id !== id);
  const index = beforeId
    ? rest.findIndex((item) => item.id === beforeId && item.date === date)
    : -1;
  rest.splice(index < 0 ? rest.length : index, 0, task);
  return rest;
}

export function remainingSeconds(session: FocusSession, now: number): number {
  const planned = session.duration * 60;
  const elapsed = ((session.stoppedAt ?? now) - session.startedAt) / 1000;
  return Math.max(0, Math.min(planned, Math.ceil(planned - elapsed)));
}

export function finishFocus(
  state: PlannerState,
  progress: string,
  completed: boolean,
  nextStep: string,
  now: number,
): PlannerState {
  const focus = state.focus;
  if (!focus) return state;
  const endedAt = Math.min(
    focus.stoppedAt ?? now,
    focus.startedAt + focus.duration * 60000,
  );
  return {
    ...state,
    focus: null,
    tasks: state.tasks.map((task) =>
      task.id !== focus.taskId
        ? task
        : {
            ...task,
            completed,
            nextStep: nextStep.trim(),
            sessions: [
              ...(task.sessions ?? []),
              {
                id: crypto.randomUUID(),
                startedAt: focus.startedAt,
                endedAt,
                minutes: Math.max(0, (endedAt - focus.startedAt) / 60000),
                progress: progress.trim(),
              },
            ],
          },
    ),
  };
}

export function monthStart(date: Date): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(12, 0, 0, 0);
  return next;
}
export function addMonths(date: Date, count: number): Date {
  const next = monthStart(date);
  next.setMonth(next.getMonth() + count);
  return next;
}
export function monthDays(date: Date): Date[] {
  const first = monthStart(date);
  const end = addDays(addMonths(first, 1), -1);
  const start = weekStart(first);
  const count = Math.ceil((((first.getDay() + 6) % 7) + end.getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}
export function removeGoal(state: PlannerState, id: string): PlannerState {
  return {
    ...state,
    goals: (state.goals ?? []).filter((goal) => goal.id !== id),
    tasks: state.tasks.map((task) =>
      task.goalId === id ? { ...task, goalId: null } : task,
    ),
  };
}

export function removeProject(state: PlannerState, id: string): PlannerState {
  return {
    ...state,
    projects: (state.projects ?? []).filter((project) => project.id !== id),
    tasks: state.tasks.map((task) =>
      task.projectId === id ? { ...task, projectId: null } : task,
    ),
  };
}
