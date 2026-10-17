import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Check, Plus, Timer, X } from 'lucide-react';
import {
  addDays,
  createTask,
  dateKey,
  decodeState,
  emptyState,
  moveTask,
  parseDate,
  STORAGE_KEY,
  updateTask,
  finishFocus,
  remainingSeconds,
  type PlannerState,
  type Task,
  monthStart,
  addMonths,
  monthDays,
  removeGoal,
  removeProject,
  type Goal,
  type Project,
} from './model';
import { MonthView, YearView, GoalsView } from './WarMapViews';
import { Modal } from './Modal';
import {
  PlannerSidebar,
  PlannerToolbar,
  type PlannerView,
} from './PlannerChrome';
import { ProjectsView } from './ProjectsView';
import { TasksView } from './TasksView';
import { useTheme } from './useTheme';
import { useToday } from './useToday';

const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const readableDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
});
const shortDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const plannedDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const MOVE_KEYS = 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight';

type Notice = { text: string; visible: boolean };
type DropTarget = { date: string | null; beforeId?: string };
type Patch = Partial<Omit<Task, 'id'>>;

function initialData(): { state: PlannerState; error: boolean } {
  try {
    return {
      state: decodeState(localStorage.getItem(STORAGE_KEY)),
      error: false,
    };
  } catch {
    return { state: emptyState(), error: true };
  }
}

function download(content: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Opens a native modal dialog and returns focus to the opener when it closes.
function useModal(
  ref: RefObject<HTMLDialogElement | null>,
  focus?: () => void,
) {
  useEffect(() => {
    const opener = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    focus?.();
    return () => {
      if (dialog?.open) dialog.close?.();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
}

function CaptureField({
  onAdd,
  label = 'New task',
  placeholder = 'Capture a task',
}: {
  onAdd: (title: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [title, setTitle] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
  };
  return (
    <form className="capture" onSubmit={submit}>
      <Plus size={16} aria-hidden="true" />
      <input
        aria-label={label}
        placeholder={placeholder}
        value={title}
        maxLength={300}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setTitle('');
        }}
      />
      {title.trim() && <button className="small-primary">Add</button>}
    </form>
  );
}

function DayComposer({
  date,
  onAdd,
}: {
  date: string;
  onAdd: (title: string, date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const day = parseDate(date);
  useEffect(() => {
    if (open) input.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      opener.current?.focus();
    }
  }, [open]);
  const close = (refocus: boolean) => {
    returnFocus.current = refocus;
    setOpen(false);
    setTitle('');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), date);
    setTitle('');
    close(true);
  };
  if (!open)
    return (
      <button
        ref={opener}
        className="add-task"
        title="Add task"
        aria-label={`Add task to ${dayName.format(day)} ${readableDate.format(day)}`}
        onClick={() => setOpen(true)}
      >
        <Plus size={15} aria-hidden="true" />
        <span>Add task</span>
      </button>
    );
  return (
    <Modal
      title="Add a task"
      description={`${dayName.format(day)}, ${readableDate.format(day)}`}
      onClose={() => close(true)}
    >
      <form onSubmit={submit}>
        <label className="field">
          Task
          <input
            ref={input}
            autoFocus
            aria-label={`New task for ${readableDate.format(day)}`}
            placeholder="What needs to get done?"
            value={title}
            maxLength={300}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <footer className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => close(true)}
          >
            Cancel
          </button>
          <button className="primary-button" disabled={!title.trim()}>
            Add task
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function TaskRow({
  task,
  dropBefore,
  focus,
  goalAction,
  showDate,
  seconds,
  onToggle,
  onEdit,
  onFocus,
  onMoveKey,
  onDrop,
  onDragOver,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  dropBefore: boolean;
  // 'active' marks the task in the running session; 'none' hides the action.
  focus: 'available' | 'active' | 'finished' | 'none';
  seconds: number;
  goalAction: boolean;
  showDate: boolean;
  onToggle: () => void;
  onEdit: (dateFirst?: boolean) => void;
  onFocus: () => void;
  onMoveKey: (key: string) => void;
  onDrop: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <li
      className={`task ${task.completed ? 'completed' : ''} ${focus === 'active' ? 'in-focus' : ''} ${dropBefore ? 'drop-before' : ''} ${goalAction ? 'goal-action' : ''}`}
      draggable={!goalAction && !showDate}
      onDragStart={goalAction || showDate ? undefined : onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={goalAction || showDate ? undefined : onDragOver}
      onDrop={goalAction || showDate ? undefined : onDrop}
    >
      <div className="task-row">
        <button
          className="task-checkbox"
          aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`}
          aria-pressed={task.completed}
          onClick={onToggle}
        >
          {task.completed && <Check size={13} strokeWidth={2.6} />}
        </button>
        <div className="task-text">
          <button
            className="task-title"
            title={task.title}
            data-task-id={task.id}
            aria-keyshortcuts={MOVE_KEYS}
            aria-describedby="move-hint"
            onClick={() => onEdit()}
            onKeyDown={(e: KeyboardEvent) => {
              if (!e.altKey || !e.key.startsWith('Arrow')) return;
              e.preventDefault();
              onMoveKey(e.key);
            }}
          >
            {task.title}
          </button>
        </div>
        {showDate && (
          <button
            className="task-date"
            aria-label={`Edit date for ${task.title}`}
            onClick={() => onEdit(true)}
          >
            {task.date ? plannedDate.format(parseDate(task.date)) : 'Add date'}
          </button>
        )}
        {focus !== 'none' && (
          <button
            className={`task-focus ${focus === 'active' ? 'timer-active' : focus === 'finished' ? 'timer-finished' : ''}`}
            aria-label={
              focus === 'active'
                ? `Open active timer for ${task.title}`
                : focus === 'finished'
                  ? `Finish session for ${task.title}`
                  : `Focus on ${task.title}`
            }
            title={
              focus === 'active'
                ? 'Session running'
                : focus === 'finished'
                  ? 'Session ended'
                  : 'Start focus'
            }
            onClick={onFocus}
          >
            {focus === 'finished' ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Timer size={15} aria-hidden="true" />
            )}
            {focus === 'active' && (
              <span aria-hidden="true">{clock(seconds)}</span>
            )}
            {focus === 'finished' && <span aria-hidden="true">Done</span>}
          </button>
        )}
      </div>
    </li>
  );
}

function DetailPanel({
  task,
  onChange,
  onClose,
  onDelete,
  dateFirst,
  goals,
  projects,
}: {
  task: Task;
  goals: Goal[];
  projects: Project[];
  dateFirst: boolean;
  onChange: (patch: Patch) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(task.date ?? '');
  const [goalId, setGoalId] = useState(task.goalId ?? '');
  const [projectId, setProjectId] = useState(task.projectId ?? '');
  const [discarding, setDiscarding] = useState(false);
  const previousTask = useRef(task);
  useEffect(() => {
    const before = previousTask.current;
    setTitle((current) => (current === before.title ? task.title : current));
    setDate((current) =>
      current === (before.date ?? '') ? (task.date ?? '') : current,
    );
    setGoalId((current) =>
      current === (before.goalId ?? '') ? (task.goalId ?? '') : current,
    );
    setProjectId((current) =>
      current === (before.projectId ?? '') ? (task.projectId ?? '') : current,
    );
    previousTask.current = task;
  }, [task]);
  const close = () => {
    if (
      title !== task.title ||
      date !== (task.date ?? '') ||
      goalId !== (task.goalId ?? '') ||
      projectId !== (task.projectId ?? '')
    )
      setDiscarding(true);
    else onClose();
  };
  return (
    <Modal
      title="Task details"
      onClose={close}
      initialFocus={dateFirst ? 'input[type="date"]' : undefined}
    >
      <form
        className="task-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          // Send only editable fields. Legacy notes and metadata stay on the task.
          onChange({
            title: title.trim(),
            date: date || null,
            ...(goalId !== (task.goalId ?? '')
              ? { goalId: goalId || null }
              : {}),
            ...(projectId !== (task.projectId ?? '')
              ? { projectId: projectId || null }
              : {}),
          });
          onClose();
        }}
      >
        <label className="field">
          Task
          <input
            autoFocus
            value={title}
            maxLength={300}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="field">
          Date (optional)
          <input
            type="date"
            value={date}
            min="0001-01-01"
            max="9999-12-31"
            onInput={(event) => setDate(event.currentTarget.value)}
          />
        </label>
        {date && (
          <button
            className="clear-date"
            type="button"
            onClick={() => setDate('')}
          >
            Clear date
          </button>
        )}
        <details className="task-organise">
          <summary>Organise</summary>
          <label className="field">
            Project
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                  {project.completed ? ' (completed)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Goal
            <select
              value={goalId}
              onChange={(event) => setGoalId(event.target.value)}
            >
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title} ({goal.year})
                </option>
              ))}
            </select>
          </label>
        </details>
        <footer className="task-editor-actions">
          <button type="button" className="delete-button" onClick={onDelete}>
            Delete task
          </button>
          <button className="primary-button" disabled={!title.trim()}>
            Save changes
          </button>
        </footer>
      </form>
      {discarding && (
        <Modal
          title="Discard changes?"
          description="Your unsaved task edits will be lost."
          onClose={() => setDiscarding(false)}
        >
          <footer className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDiscarding(false)}
            >
              Keep editing
            </button>
            <button className="danger-button" onClick={onClose}>
              Discard changes
            </button>
          </footer>
        </Modal>
      )}
    </Modal>
  );
}

function Help({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useModal(dialog);
  return (
    <dialog
      ref={dialog}
      className="help-dialog"
      aria-labelledby="help-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="panel-header">
        <h2 id="help-title">How the planner works</h2>
        <button
          className="icon-button"
          aria-label="Close planner help"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <ul>
        <li>
          Use Tasks to capture work before scheduling it, Year for an overview,
          Month to schedule work, and Goals to list actions under up to four
          goals per year. Choose a task’s timer to start a separate focus
          session. Set the minutes and begin; stop early whenever you like.
          Completion stays on the task row.
        </li>
        <li>Type in Tasks and press Enter to capture an unscheduled task.</li>
        <li>
          Drag a task to another day or position. With the keyboard, focus a
          task and press Alt (Option) with Up or Down to reorder, or Left or
          Right to move it a day.
        </li>
        <li>
          Open a task to change its title or optional date. Create an action
          under a goal to link it automatically. Existing notes remain in saved
          data and exported backups.
        </li>
        <li>
          All tasks stay in Tasks, including scheduled and completed work.
          Adding a date also puts a task on the calendar. Unfinished tasks stay
          on their date until you change it.
        </li>
      </ul>
      <p className="help-storage">
        Tasks are saved in this browser on this device. Clearing site data
        removes them. Use Export to keep a backup file.
      </p>
    </dialog>
  );
}

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

type FocusMode = 'setup' | 'running' | 'review';
function FocusPanel({
  task,
  session,
  onStart,
  onStop,
  onFinish,
}: {
  task: Task;
  session: PlannerState['focus'];
  onStart: (duration: number) => void;
  onStop: () => void;
  onFinish: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [minutes, setMinutes] = useState('60');
  const panel = useRef<HTMLElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const previous = useRef<FocusMode | null>(null);
  const seconds = session ? remainingSeconds(session, now) : 0;
  const mode: FocusMode = !session
    ? 'setup'
    : session.stoppedAt !== undefined || seconds === 0
      ? 'review'
      : 'running';
  const duration = Number(minutes);
  const valid = Number.isInteger(duration) && duration >= 1 && duration <= 180;
  useEffect(() => {
    if (mode !== 'running') return;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [mode]);
  useEffect(() => {
    const before = previous.current;
    previous.current = mode;
    if (mode === 'setup') minutesRef.current?.focus();
    else if (mode === 'running' && before === 'setup') panel.current?.focus();
    else if (mode === 'review') finishRef.current?.focus();
  }, [mode]);
  return (
    <section
      ref={panel}
      tabIndex={-1}
      className={`focus-panel focus-${mode}`}
      aria-label="Focus session"
    >
      <h3 className="focus-task">{task.title}</h3>
      {mode === 'setup' ? (
        <form
          className="focus-start"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) onStart(duration);
          }}
        >
          <label className="field">
            Minutes
            <input
              ref={minutesRef}
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              step={1}
              required
              aria-invalid={!valid}
              aria-describedby="focus-minutes-hint"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
          <small
            id="focus-minutes-hint"
            className={valid ? 'visually-hidden' : 'focus-error'}
          >
            Choose 1 to 180 minutes.
          </small>
          <button className="primary-button" disabled={!valid}>
            Begin session
          </button>
        </form>
      ) : mode === 'running' ? (
        <div className="focus-running-controls">
          <output aria-label="Time remaining" className="focus-clock">
            {clock(seconds)}
          </output>
          <button
            className="secondary-button"
            aria-label="Stop session"
            onClick={onStop}
          >
            Stop
          </button>
        </div>
      ) : (
        <div className="focus-review">
          <p>Session ended.</p>
          <button ref={finishRef} className="primary-button" onClick={onFinish}>
            Finish session
          </button>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'month' | 'year'>('month');
  const [initial] = useState(initialData);
  const [now, setNow] = useState(Date.now());
  const [state, setState] = useState<PlannerState>(initial.state);
  const [readError, setReadError] = useState(initial.error);
  const [saveError, setSaveError] = useState(false);
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [view, setView] = useState<PlannerView>('tasks');
  const [showCompleted, setShowCompleted] = useState(false);
  useEffect(() => {
    if (view === 'month' || view === 'year') setCalendarMode(view);
  }, [view]);
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDateFirst, setEditingDateFirst] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    id: string | null;
    onlyIfLost: boolean;
  } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [deleted, setDeleted] = useState<{ task: Task; index: number } | null>(
    null,
  );
  const today = useToday();
  const days = monthDays(month);
  const currentTask = state.tasks.find((task) => task.id === editingId);
  const visibleDays = days;
  const listedTasks = state.tasks.filter(
    (task) => showCompleted || !task.completed,
  );
  const focusTask = state.tasks.find(
    (task) => task.id === (state.focus?.taskId ?? focusTaskId),
  );
  const sessionRunning =
    !!state.focus &&
    state.focus.stoppedAt === undefined &&
    remainingSeconds(state.focus, now) > 0;
  useEffect(() => {
    if (!sessionRunning) return;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [state.focus, sessionRunning]);
  const announce = (text: string, visible = false) =>
    setNotice({ text, visible });

  useEffect(() => {
    if (readError) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [state, readError]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      // Keep unsaved local work if storage is unavailable; do not overwrite it.
      if (saveError || readError) return;
      try {
        setFocusTaskId(null);
        setState(decodeState(event.newValue));
        setDeleted(null);
        setEditingId(null);
        announce('Planner updated from another tab.', true);
      } catch {
        setReadError(true);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [readError, saveError]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  // Keep keyboard focus on a task after it moves or its dialog closes.
  useEffect(() => {
    if (!focusRequest) return;
    setFocusRequest(null);
    const active = document.activeElement;
    if (focusRequest.onlyIfLost && active && active !== document.body) return;
    const target = Array.from(
      document.querySelectorAll<HTMLElement>('[data-task-id]'),
    ).find((element) => element.dataset.taskId === focusRequest.id);
    if (target) target.focus();
    else if (view === 'tasks')
      document
        .querySelector<HTMLInputElement>('.tasks-view .capture input')
        ?.focus();
    else if (view === 'goals' || view === 'projects')
      document
        .querySelector<HTMLInputElement>('.goal-action-composer input')
        ?.focus();
  }, [focusRequest]);

  const setTasks = (change: (tasks: Task[]) => Task[]) =>
    setState((current) => ({ ...current, tasks: change(current.tasks) }));
  const addTask = (title: string, date: string | null) => {
    setTasks((tasks) => [...tasks, createTask(title, date)]);
    announce(`Added “${title}”.`);
  };
  const editTask = (id: string, patch: Patch) =>
    setTasks((tasks) => updateTask(tasks, id, patch));
  const goPeriod = (direction: number) => {
    const next = addMonths(month, direction * (view === 'month' ? 1 : 12));
    setMonth(next);
    setSelectedDay(dateKey(next));
  };
  const goToday = () => {
    setMonth(monthStart(new Date()));
    setSelectedDay(today);
  };
  const showDate = (date: string) => {
    const day = parseDate(date);
    setMonth(monthStart(day));
    setView('month');
    setSelectedDay(date);
  };
  // Keep the full task list in place; calendar edits follow their new date.
  const reveal = (date: string | null) => {
    if (view === 'tasks') return;
    if (date) showDate(date);
    else setView('tasks');
  };
  const moveTo = (task: Task, date: string | null, follow: boolean) => {
    const moved = moveTask(state.tasks, task.id, date);
    setState((current) => ({ ...current, tasks: moved }));
    const kept = moved.find((item) => item.id === task.id)?.main;
    const label = date ? shortDate.format(parseDate(date)) : 'Unscheduled';
    const outOfView =
      !follow &&
      date !== null &&
      !visibleDays.some((day) => dateKey(day) === date);
    if (task.main && !kept)
      announce(`Moved to ${label}. That day already has a main outcome.`, true);
    else announce(`Moved to ${label}.`, outOfView);
    if (follow && date && view !== 'tasks') showDate(date);
    setFocusRequest({ id: task.id, onlyIfLost: !follow });
  };
  const reorder = (id: string, direction: -1 | 1) => {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return false;
    const siblings = state.tasks.filter((item) =>
      view === 'tasks'
        ? showCompleted || !item.completed
        : view === 'projects'
          ? item.projectId === task.projectId
          : view === 'goals'
            ? item.goalId === task.goalId
            : item.date === task.date,
    );
    const neighbour =
      siblings[siblings.findIndex((item) => item.id === id) + direction];
    if (!neighbour) return false;
    setTasks((tasks) => {
      const next = [...tasks];
      const from = next.findIndex((item) => item.id === id);
      const to = next.findIndex((item) => item.id === neighbour.id);
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    announce(direction < 0 ? 'Moved up.' : 'Moved down.');
    return true;
  };
  const onMoveKey = (task: Task, key: string) => {
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      if (reorder(task.id, key === 'ArrowUp' ? -1 : 1))
        setFocusRequest({ id: task.id, onlyIfLost: false });
      return;
    }
    const step = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    if (task.date === null) {
      if (step > 0) moveTo(task, today, true);
      return;
    }
    moveTo(task, dateKey(addDays(parseDate(task.date), step)), true);
  };
  const clearDrag = () => {
    setDraggingId(null);
    setDropTarget(null);
  };
  const onDrop = (event: DragEvent, date: string | null, beforeId?: string) => {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData('text/plain');
    if (state.tasks.some((task) => task.id === id)) {
      setTasks((tasks) => moveTask(tasks, id, date, beforeId));
      announce('Task moved.');
    }
    clearDrag();
  };
  const overTarget = (
    event: DragEvent,
    date: string | null,
    beforeId?: string,
  ) => {
    if (!draggingId) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget((current) =>
      current?.date === date && current.beforeId === beforeId
        ? current
        : { date, beforeId },
    );
  };
  const dragStart = (event: DragEvent, id: string) => {
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  };
  const dropProps = (date: string | null) => ({
    onDragOver: (event: DragEvent) => overTarget(event, date),
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null))
        setDropTarget(null);
    },
    onDrop: (event: DragEvent) => onDrop(event, date),
  });
  const renderList = (
    tasks: Task[],
    date: string | null,
    goalAction = false,
  ) => (
    <ul
      className={`task-list ${draggingId && dropTarget?.date === date && !dropTarget.beforeId ? 'drop-end' : ''}`}
    >
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          goalAction={goalAction}
          showDate={view === 'tasks'}
          dropBefore={
            !!draggingId &&
            draggingId !== task.id &&
            dropTarget?.beforeId === task.id
          }
          focus={
            state.focus?.taskId === task.id
              ? state.focus.stoppedAt !== undefined ||
                remainingSeconds(state.focus, now) === 0
                ? 'finished'
                : 'active'
              : state.focus || readError || task.completed
                ? 'none'
                : 'available'
          }
          seconds={
            state.focus?.taskId === task.id
              ? remainingSeconds(state.focus, now)
              : 0
          }
          onToggle={() => {
            if (view === 'tasks' && !showCompleted && !task.completed) {
              const index = listedTasks.findIndex(
                (item) => item.id === task.id,
              );
              const next = listedTasks[index + 1] ?? listedTasks[index - 1];
              setFocusRequest({ id: next?.id ?? null, onlyIfLost: false });
            }
            editTask(task.id, { completed: !task.completed });
          }}
          onEdit={(dateFirst = false) => {
            setEditingDateFirst(dateFirst);
            setEditingId(task.id);
          }}
          onFocus={() => {
            setFocusTaskId(task.id);
          }}
          onMoveKey={(key) => onMoveKey(task, key)}
          onDrop={(event) => onDrop(event, task.date, task.id)}
          onDragOver={(event) => overTarget(event, task.date, task.id)}
          onDragStart={(event) => dragStart(event, task.id)}
          onDragEnd={clearDrag}
        />
      ))}
    </ul>
  );
  const retrySave = () => {
    try {
      if (readError) {
        setState(decodeState(localStorage.getItem(STORAGE_KEY)));
        setReadError(false);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSaveError(false);
      }
      announce('Planner saved.', true);
    } catch {
      announce(
        'Storage is still unavailable. Export a backup to keep your work.',
        true,
      );
    }
  };
  const exportBackup = () => {
    download(JSON.stringify(state, null, 2), `ultrafocussed-${today}.json`);
    announce('Planner backup exported.', true);
  };
  // When saved data cannot be read, offer the raw stored value, not the empty planner.
  const exportRaw = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) throw new Error('Nothing stored');
      download(raw, `ultrafocussed-unreadable-${today}.json`);
      announce('Saved data downloaded as it is stored.', true);
    } catch {
      announce('Could not read the saved data from this browser.', true);
    }
  };
  const importRef = useRef<HTMLInputElement>(null);
  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error('Backup too large');
      const backup = decodeState(await file.text());
      if (
        window.confirm(
          `Replace this planner with ${backup.tasks.length} tasks from this backup? Export your current planner first if you want to keep it.`,
        )
      ) {
        setFocusTaskId(null);
        setState(backup);
        setReadError(false);
        setEditingId(null);
        setDeleted(null);
        announce('Planner restored from backup.', true);
      }
    } catch {
      announce(
        'Could not import this file. Choose an Ultrafocussed JSON backup under 10 MB.',
        true,
      );
    }
    if (importRef.current) importRef.current.value = '';
  };

  const focusContent: ReactNode = !readError && focusTask && (
    <FocusPanel
      key={focusTask.id}
      task={focusTask}
      session={state.focus}
      onStart={(duration) => {
        setState((current) => ({
          ...current,
          focus: { taskId: focusTask.id, startedAt: Date.now(), duration },
        }));
        announce(`Focus started for ${duration} minutes.`);
      }}
      onStop={() =>
        setState((current) =>
          current.focus
            ? {
                ...current,
                focus: {
                  ...current.focus,
                  stoppedAt: Math.min(
                    Date.now(),
                    current.focus.startedAt + current.focus.duration * 60000,
                  ),
                },
              }
            : current,
        )
      }
      onFinish={() => {
        setFocusTaskId(null);
        setState((current) => {
          const latest = current.tasks.find((task) => task.id === focusTask.id);
          return finishFocus(
            current,
            '',
            latest?.completed ?? false,
            latest?.nextStep ?? '',
            Date.now(),
          );
        });
        reveal(focusTask.date);
        setFocusRequest({ id: focusTask.id, onlyIfLost: false });
        announce('Session saved.');
      }}
    />
  );

  return (
    <div className="app-shell">
      <PlannerSidebar
        view={view}
        onView={(mode) => {
          setView(mode === 'month' ? calendarMode : mode);
        }}
        theme={theme}
        onTheme={toggleTheme}
        onExport={exportBackup}
        onImport={() => importRef.current?.click()}
        onHelp={() => setHelpOpen(true)}
        readError={readError}
        saveError={saveError}
      />
      <div className="planner-workspace">
        {view !== 'tasks' && (
          <PlannerToolbar
            view={view}
            title={
              view === 'month'
                ? new Intl.DateTimeFormat(undefined, {
                    month: 'long',
                    year: 'numeric',
                  }).format(month)
                : view === 'projects'
                  ? 'Projects'
                  : month.getFullYear()
            }
            onToday={goToday}
            onPeriod={goPeriod}
            onCalendarView={setView}
            onAddProject={
              view === 'projects' && !readError
                ? () => setCreatingProject(true)
                : undefined
            }
            onAddGoal={
              view === 'goals' &&
              !readError &&
              (state.goals ?? []).filter(
                (goal) => goal.year === month.getFullYear(),
              ).length < 4
                ? () => setCreatingGoal(true)
                : undefined
            }
          />
        )}
        {(readError || saveError) && (
          <div className="storage-error" role="alert">
            <span>
              {readError
                ? 'We couldn’t read your saved planner. Existing data has not been overwritten. Retry or restore a backup.'
                : 'Your latest changes could not be saved. Keep this page open and retry, or export a backup.'}
            </span>
            <button onClick={retrySave}>Retry</button>
            {readError ? (
              <>
                <button onClick={() => importRef.current?.click()}>
                  Restore backup
                </button>
                <button onClick={exportRaw}>Download saved data</button>
              </>
            ) : (
              <button onClick={exportBackup}>Export backup</button>
            )}
          </div>
        )}
        <main>
          <span id="move-hint" hidden>
            Alt with arrow keys moves this task.
          </span>
          <fieldset
            className={`planner-content war-map-content view-${view}`}
            disabled={readError}
          >
            {view === 'tasks' ? (
              <TasksView
                capture={
                  <CaptureField onAdd={(title) => addTask(title, null)} />
                }
                empty={listedTasks.length === 0}
                hasTasks={state.tasks.length > 0}
                showCompleted={showCompleted}
                onShowCompleted={setShowCompleted}
              >
                {renderList(listedTasks, null)}
              </TasksView>
            ) : view === 'month' ? (
              <div className="month-calendar">
                <MonthView
                  month={month}
                  tasks={state.tasks}
                  selected={selectedDay}
                  onSelect={setSelectedDay}
                  dropProps={dropProps}
                  renderDay={(day) => {
                    const key = dateKey(day);
                    return (
                      <>
                        {renderList(
                          state.tasks.filter((task) => task.date === key),
                          key,
                        )}
                        <DayComposer date={key} onAdd={addTask} />
                      </>
                    );
                  }}
                />
              </div>
            ) : view === 'year' ? (
              <YearView
                year={month.getFullYear()}
                tasks={state.tasks}
                onMonth={(date) => {
                  setMonth(date);
                  setSelectedDay(dateKey(date));
                  setView('month');
                }}
                onDay={showDate}
              />
            ) : view === 'projects' ? (
              <ProjectsView
                projects={state.projects ?? []}
                tasks={state.tasks}
                creating={creatingProject}
                onCreationClose={() => setCreatingProject(false)}
                renderTasks={(tasks) => renderList(tasks, null, true)}
                onAdd={(title) =>
                  setState((current) => ({
                    ...current,
                    projects: [
                      ...(current.projects ?? []),
                      { id: crypto.randomUUID(), title, completed: false },
                    ],
                  }))
                }
                onRename={(id, title) =>
                  setState((current) => ({
                    ...current,
                    projects: (current.projects ?? []).map((project) =>
                      project.id === id ? { ...project, title } : project,
                    ),
                  }))
                }
                onToggleState={(id) =>
                  setState((current) => ({
                    ...current,
                    projects: (current.projects ?? []).map((project) =>
                      project.id === id
                        ? { ...project, completed: !project.completed }
                        : project,
                    ),
                  }))
                }
                onRemove={(id) =>
                  setState((current) => removeProject(current, id))
                }
                onAddTask={(title, projectId) =>
                  setTasks((tasks) => [
                    ...tasks,
                    { ...createTask(title, null), projectId },
                  ])
                }
              />
            ) : (
              <GoalsView
                creating={creatingGoal}
                onCreationClose={() => setCreatingGoal(false)}
                year={month.getFullYear()}
                goals={state.goals ?? []}
                tasks={state.tasks}
                renderActions={(tasks) => renderList(tasks, null, true)}
                onAddGoal={(title) =>
                  setState((current) => {
                    if (
                      (current.goals ?? []).filter(
                        (goal) => goal.year === month.getFullYear(),
                      ).length >= 4
                    )
                      return current;
                    return {
                      ...current,
                      goals: [
                        ...(current.goals ?? []),
                        {
                          id: crypto.randomUUID(),
                          title,
                          year: month.getFullYear(),
                        },
                      ],
                    };
                  })
                }
                onRename={(id, title) =>
                  setState((current) => ({
                    ...current,
                    goals: (current.goals ?? []).map((goal) =>
                      goal.id === id ? { ...goal, title } : goal,
                    ),
                  }))
                }
                onDelete={(id) =>
                  setState((current) => removeGoal(current, id))
                }
                onAddAction={(title, goalId) =>
                  setTasks((tasks) => [
                    ...tasks,
                    { ...createTask(title, null), goalId },
                  ])
                }
              />
            )}
          </fieldset>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Import planner backup"
            onChange={(event) => {
              void importBackup(event.target.files?.[0]);
            }}
          />
        </main>
      </div>
      <div className="toast-region" role="status" aria-live="polite">
        {deleted ? (
          <div className="toast">
            <span>Task deleted.</span>
            <button
              onClick={() => {
                setTasks((tasks) => {
                  const next = [...tasks];
                  const restored = { ...deleted.task };
                  if (
                    restored.main &&
                    next.some(
                      (task) => task.date === restored.date && task.main,
                    )
                  )
                    restored.main = false;
                  next.splice(
                    Math.min(deleted.index, next.length),
                    0,
                    restored,
                  );
                  return next;
                });
                setDeleted(null);
                announce('Task restored.');
              }}
            >
              Undo
            </button>
            <button
              className="icon-button"
              aria-label="Dismiss undo"
              onClick={() => setDeleted(null)}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          notice &&
          (notice.visible ? (
            <div className="toast">
              <span>{notice.text}</span>
            </div>
          ) : (
            <span className="visually-hidden">{notice.text}</span>
          ))
        )}
      </div>
      {currentTask && (
        <DetailPanel
          key={currentTask.id}
          task={currentTask}
          goals={state.goals ?? []}
          projects={state.projects ?? []}
          dateFirst={editingDateFirst}
          onClose={() => {
            setEditingId(null);
            // A save that moved the task has already asked for focus; keep it.
            setFocusRequest((current) =>
              current?.id === currentTask.id && !current.onlyIfLost
                ? current
                : { id: currentTask.id, onlyIfLost: true },
            );
          }}
          onChange={(patch) => {
            editTask(currentTask.id, patch);
            const date = patch.date ?? null;
            if (date === currentTask.date) {
              announce('Task updated.');
              return;
            }
            // Follow the task to its new date so its title can take focus.
            reveal(date);
            setFocusRequest({ id: currentTask.id, onlyIfLost: false });
            announce(
              `Task moved to ${date ? shortDate.format(parseDate(date)) : 'Unscheduled'}.`,
            );
          }}
          onDelete={() => {
            if (state.focus?.taskId === currentTask.id) {
              announce(
                'Finish the session for this task before deleting it.',
                true,
              );
              return;
            }
            if (focusTaskId === currentTask.id) setFocusTaskId(null);
            setDeleted({
              task: currentTask,
              index: state.tasks.findIndex(
                (task) => task.id === currentTask.id,
              ),
            });
            setTasks((tasks) =>
              tasks.filter((task) => task.id !== currentTask.id),
            );
            setEditingId(null);
          }}
        />
      )}
      {focusTaskId && focusContent && (
        <Modal
          title="Focus"
          onClose={() => {
            setFocusRequest({ id: focusTaskId, onlyIfLost: false });
            setFocusTaskId(null);
          }}
        >
          {focusContent}
        </Modal>
      )}
      {helpOpen && <Help onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
