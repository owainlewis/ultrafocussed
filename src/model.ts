export type Goal = {
  id: string;
  title: string;
  reason: string;
  targetDate: string | null;
  focus: string;
  completed: boolean;
};

export type Task = {
  goalId?: string | null;
  id: string;
  title: string;
  date: string | null;
  completed: boolean;
  notes: string;
  main: boolean;
};
export type PlannerState = { version: 2; tasks: Task[]; goals: Goal[] };
export const STORAGE_KEY = 'ultrafocussed.planner.v1';
export const emptyState = (): PlannerState => ({
  version: 2,
  tasks: [],
  goals: [],
});

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
  if (![1, 2].includes(value?.version) || !Array.isArray(value.tasks))
    throw new Error('Unsupported planner data');
  const goals: Goal[] = value.version === 1 ? [] : value.goals;
  if (!Array.isArray(goals)) throw new Error('Invalid goals');
  const goalIds = new Set<string>();
  for (const goal of goals) {
    if (
      !goal ||
      typeof goal.id !== 'string' ||
      !goal.id ||
      goalIds.has(goal.id) ||
      typeof goal.title !== 'string' ||
      !goal.title.trim() ||
      goal.title.length > 300 ||
      typeof goal.reason !== 'string' ||
      goal.reason.length > 10000 ||
      typeof goal.focus !== 'string' ||
      goal.focus.length > 10000 ||
      typeof goal.completed !== 'boolean' ||
      (goal.targetDate !== null && !validDate(goal.targetDate))
    )
      throw new Error('Invalid goal');
    goalIds.add(goal.id);
  }
  const ids = new Set<string>();
  const mainDates = new Set<string>();
  for (const task of value.tasks) {
    if (
      !task ||
      (task.goalId != null &&
        (typeof task.goalId !== 'string' || !goalIds.has(task.goalId))) ||
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
  return { version: 2, tasks: value.tasks, goals };
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
