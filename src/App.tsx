import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Plus,
  Star,
  Upload,
  X,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  createTask,
  dateKey,
  decodeState,
  emptyState,
  monthDays,
  moveTask,
  parseDate,
  STORAGE_KEY,
  updateTask,
  weekStart,
  type PlannerState,
  type Task,
  type Goal,
} from './model';

const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const shortDay = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const readableDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
});
const shortDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const rangeDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const monthName = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});
const MOVE_KEYS = 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight';
const NARROW = '(max-width: 760px)';

type Notice = { text: string; visible: boolean };
type DropTarget = { date: string | null; beforeId?: string };
type Patch = Partial<Omit<Task, 'id'>>;
type View = 'week' | 'month';

// Matches the mobile breakpoint in styles.css. On mobile the month shows one day's list below the grid.
function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof matchMedia === 'function' && matchMedia(NARROW).matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const list = matchMedia(NARROW);
    const change = () => setNarrow(list.matches);
    list.addEventListener('change', change);
    return () => list.removeEventListener('change', change);
  }, []);
  return narrow;
}

const goalStatus = (goal: Goal) =>
  goal.completed
    ? 'Completed'
    : goal.targetDate
      ? `Target: ${rangeDate.format(parseDate(goal.targetDate))}`
      : 'No target date';

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

function CaptureField({ onAdd }: { onAdd: (title: string) => void }) {
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
        aria-label="New task for unscheduled"
        placeholder="Capture a task"
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
    input.current?.focus();
  };
  if (!open)
    return (
      <button
        ref={opener}
        className="add-task"
        aria-label={`Add task to ${dayName.format(day)} ${readableDate.format(day)}`}
        onClick={() => setOpen(true)}
      >
        <Plus size={15} aria-hidden="true" />
        <span>Add task</span>
      </button>
    );
  return (
    <form
      className="composer"
      onSubmit={submit}
      onBlur={(e) => {
        if (!title.trim() && !e.currentTarget.contains(e.relatedTarget))
          close(false);
      }}
    >
      <input
        ref={input}
        aria-label={`New task for ${readableDate.format(day)}`}
        placeholder="New task"
        value={title}
        maxLength={300}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close(true);
          }
        }}
      />
      <div className="composer-actions">
        <span>Enter to add, Esc to close</span>
        <button
          type="button"
          className="icon-button"
          aria-label="Close task entry"
          onClick={() => close(true)}
        >
          <X size={15} />
        </button>
      </div>
    </form>
  );
}

function TaskRow({
  task,
  goalTitle,
  dropBefore,
  onToggle,
  onEdit,
  onMoveKey,
  onDrop,
  onDragOver,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  goalTitle?: string;
  dropBefore: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMoveKey: (key: string) => void;
  onDrop: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
}) {
  const note = task.notes.trim().split('\n')[0];
  return (
    <li
      className={`task ${task.completed ? 'completed' : ''} ${task.main ? 'main-task' : ''} ${dropBefore ? 'drop-before' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {task.main && (
        <span className="outcome-label">
          <Star size={12} fill="currentColor" aria-hidden="true" /> Main outcome
        </span>
      )}
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
            data-task-id={task.id}
            aria-keyshortcuts={MOVE_KEYS}
            aria-describedby="move-hint"
            onClick={onEdit}
            onKeyDown={(e: KeyboardEvent) => {
              if (!e.altKey || !e.key.startsWith('Arrow')) return;
              e.preventDefault();
              onMoveKey(e.key);
            }}
          >
            {task.title}
          </button>
          {goalTitle && <p className="task-goal">{goalTitle}</p>}
          {note && <p className="task-note">{note}</p>}
        </div>
      </div>
    </li>
  );
}

function DetailPanel({
  task,
  tasks,
  goals,
  today,
  onChange,
  onClose,
  onDelete,
  onReorder,
}: {
  task: Task;
  tasks: Task[];
  goals: Goal[];
  today: string;
  onChange: (patch: Patch) => void;
  onClose: () => void;
  onDelete: () => void;
  onReorder: (direction: -1 | 1) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const dateId = useId();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [date, setDate] = useState(task.date ?? '');
  const [main, setMain] = useState(task.main);
  const [goalId, setGoalId] = useState(task.goalId ?? '');
  const siblings = tasks.filter((item) => item.date === task.date);
  const index = siblings.findIndex((item) => item.id === task.id);
  const dirty =
    title !== task.title ||
    notes !== task.notes ||
    date !== (task.date ?? '') ||
    main !== task.main ||
    goalId !== (task.goalId ?? '');
  useModal(dialog, () => titleRef.current?.focus());
  const close = () => {
    if (dirty && !window.confirm('Discard your unsaved task changes?')) return;
    onClose();
  };
  const choose = (value: string) => {
    setDate(value);
    if (!value) setMain(false);
  };
  const quickDates: [string, string][] = [
    ['Unscheduled', ''],
    ['Today', today],
    ['Tomorrow', dateKey(addDays(parseDate(today), 1))],
    ['Next Monday', dateKey(addDays(weekStart(parseDate(today)), 7))],
  ];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onChange({
      goalId: goalId || null,
      title: title.trim(),
      notes,
      date: date || null,
      main: date ? main : false,
    });
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="detail-panel"
      aria-labelledby="detail-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="detail-content">
        <header className="panel-header">
          <h2 id="detail-title">Task details</h2>
          <button
            className="icon-button"
            aria-label="Close task details"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        <form onSubmit={submit} className="detail-form">
          <label className="field">
            Task
            <textarea
              ref={titleRef}
              className="title-input"
              value={title}
              maxLength={300}
              rows={2}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="field">
            <label htmlFor={dateId}>Plan for</label>
            <input
              id={dateId}
              type="date"
              value={date}
              min="0001-01-01"
              max="9999-12-31"
              onInput={(e) => choose(e.currentTarget.value)}
            />
            <div className="quick-dates" role="group" aria-label="Quick dates">
              {quickDates.map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  className="chip"
                  aria-pressed={date === value}
                  onClick={() => choose(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            Goal
            <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                  {goal.completed ? ' (completed)' : ''}
                </option>
              ))}
            </select>
          </label>
          {date && (
            <label className="main-option">
              <input
                type="checkbox"
                checked={main}
                onChange={(e) => setMain(e.target.checked)}
              />
              <span>
                <strong>Main outcome</strong>
                <small>The one thing you want to finish that day.</small>
              </span>
            </label>
          )}
          <label className="field">
            <span>
              Notes <span className="optional">Optional</span>
            </span>
            <textarea
              rows={6}
              maxLength={10000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="order-controls">
            <span>
              Position in {task.date ? 'this day' : 'Unscheduled'}
              <small>Alt + arrow keys on a task also move it.</small>
            </span>
            <button
              className="secondary-button"
              type="button"
              disabled={dirty || index === 0}
              onClick={() => onReorder(-1)}
            >
              <ArrowUp size={14} /> Up
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={dirty || index === siblings.length - 1}
              onClick={() => onReorder(1)}
            >
              <ArrowDown size={14} /> Down
            </button>
          </div>
          <div className="panel-footer">
            <button type="button" className="delete-button" onClick={onDelete}>
              Delete task
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!title.trim()}
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// The week view shows goals as a collapsible strip; the month view shows them beside the calendar.
function GoalsPanel({
  goals,
  tasks,
  disabled,
  layout,
  onSave,
  onOpenTask,
}: {
  goals: Goal[];
  tasks: Task[];
  disabled: boolean;
  layout: 'strip' | 'side';
  onSave: (goal: Goal) => void;
  onOpenTask: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Goal | null>(null);
  const [expanded, setExpanded] = useState(false);
  // A restored backup or another tab must not leave a stale goal draft open.
  useEffect(() => setEditing(null), [goals]);
  const active = goals.filter((goal) => !goal.completed);
  const addButton = (
    <button
      className="secondary-button"
      disabled={disabled}
      onClick={() =>
        setEditing({
          id: crypto.randomUUID(),
          title: '',
          reason: '',
          targetDate: null,
          focus: '',
          completed: false,
        })
      }
    >
      Add goal
    </button>
  );
  const editor = editing && !disabled && (
    <GoalEditor
      key={editing.id}
      goal={editing}
      onClose={() => setEditing(null)}
      onSave={(goal) => {
        onSave(goal);
        setEditing(null);
        setExpanded(true);
      }}
    />
  );
  if (layout === 'side')
    return (
      <aside className="goals-side" aria-labelledby="goals-side-title">
        <div className="goals-side-heading">
          <h2 id="goals-side-title">
            Goals <span className="count">{active.length}</span>
          </h2>
          {addButton}
        </div>
        {goals.length === 0 && (
          <p className="empty-note">
            No goals yet. Add an outcome you want to achieve.
          </p>
        )}
        <ul className="goal-cards">
          {goals.map((goal) => {
            // Dated work first, in date order, then unscheduled work.
            const linked = tasks
              .filter((task) => task.goalId === goal.id && !task.completed)
              .sort((a, b) =>
                a.date === b.date
                  ? 0
                  : b.date === null || (a.date !== null && a.date < b.date)
                    ? -1
                    : 1,
              );
            return (
              <li
                key={goal.id}
                className={`goal-card ${goal.completed ? 'goal-completed' : ''}`}
              >
                <button
                  className="goal-open"
                  disabled={disabled}
                  onClick={() => setEditing(goal)}
                >
                  <strong>{goal.title}</strong>
                  <span>{goalStatus(goal)}</span>
                </button>
                <div className="goal-focus">
                  <h3>Next 90 days</h3>
                  <p>{goal.focus || 'Not set yet.'}</p>
                </div>
                {linked.length > 0 && (
                  <ul
                    className="goal-tasks"
                    aria-label={`Open tasks for ${goal.title}`}
                  >
                    {linked.map((task) => (
                      <li key={task.id}>
                        <button onClick={() => onOpenTask(task.id)}>
                          {task.title}
                          <small>
                            {task.date
                              ? shortDate.format(parseDate(task.date))
                              : 'Unscheduled'}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        {editor}
      </aside>
    );
  return (
    <section className="goals-section" aria-label="Your goals">
      <div className="goals-heading">
        <button
          className="text-button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          Goals <span className="count">{active.length}</span>
        </button>
        {!expanded && (
          <p>
            {active.length
              ? active.map((goal) => goal.title).join(' · ')
              : 'Give your daily work a direction.'}
          </p>
        )}
        {addButton}
      </div>
      {expanded && (
        <div className="goals-list">
          {goals.length === 0 && (
            <p>No goals yet. Add an outcome you want to achieve.</p>
          )}
          {goals.map((goal) => (
            <button
              className={`goal-summary ${goal.completed ? 'goal-completed' : ''}`}
              key={goal.id}
              disabled={disabled}
              onClick={() => setEditing(goal)}
            >
              <strong>{goal.title}</strong>
              <span>{goalStatus(goal)}</span>
              {goal.focus && (
                <p>
                  <span>Next 90 days:</span> {goal.focus}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
      {editor}
    </section>
  );
}

function GoalEditor({
  goal,
  onSave,
  onClose,
}: {
  goal: Goal;
  onSave: (goal: Goal) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(goal);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  useModal(dialog, () => titleRef.current?.focus());
  const close = () => {
    if (
      JSON.stringify(draft) !== JSON.stringify(goal) &&
      !window.confirm('Discard your unsaved goal changes?')
    )
      return;
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="detail-panel"
      aria-labelledby="goal-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="detail-content">
        <header className="panel-header">
          <h2 id="goal-editor-title">Goal details</h2>
          <button
            className="icon-button"
            aria-label="Close goal details"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        <form
          className="detail-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.title.trim())
              onSave({ ...draft, title: draft.title.trim() });
          }}
        >
          <label className="field">
            Outcome
            <input
              ref={titleRef}
              required
              maxLength={300}
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
          </label>
          <label className="field">
            Why it matters
            <textarea
              rows={3}
              maxLength={10000}
              value={draft.reason}
              onChange={(event) =>
                setDraft({ ...draft, reason: event.target.value })
              }
            />
          </label>
          <label className="field">
            Target date
            <input
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={draft.targetDate ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, targetDate: event.target.value || null })
              }
            />
          </label>
          <label className="field">
            Next 90 days
            <textarea
              rows={3}
              maxLength={10000}
              value={draft.focus}
              onChange={(event) =>
                setDraft({ ...draft, focus: event.target.value })
              }
            />
          </label>
          <label className="main-option">
            <input
              type="checkbox"
              checked={draft.completed}
              onChange={(event) =>
                setDraft({ ...draft, completed: event.target.checked })
              }
            />
            <span>Goal completed</span>
          </label>
          <div className="panel-footer">
            <button className="secondary-button" type="button" onClick={close}>
              Cancel
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={!draft.title.trim()}
            >
              Save goal
            </button>
          </div>
        </form>
      </div>
    </dialog>
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
        <li>Type in Unscheduled and press Enter to capture a task.</li>
        <li>
          Drag a task to another day or position. With the keyboard, focus a
          task and press Alt (Option) with Up or Down to reorder, or Left or
          Right to move it a day.
        </li>
        <li>
          Open a task to edit its notes, pick a date, or make it the day’s main
          outcome.
        </li>
        <li>
          Switch between Week and Month in the top bar. Month shows every date,
          with each goal and its next 90 days alongside.
        </li>
        <li>
          Unfinished tasks stay on their day. They are listed under From earlier
          until you move, finish, or delete them.
        </li>
      </ul>
      <p className="help-storage">
        Tasks are saved in this browser on this device. Clearing site data
        removes them. Use Export to keep a backup file.
      </p>
    </dialog>
  );
}

export default function App() {
  const [initial] = useState(initialData);
  const [state, setState] = useState<PlannerState>(initial.state);
  const [readError, setReadError] = useState(initial.error);
  const [saveError, setSaveError] = useState(false);
  // The selected date anchors both views: the week and month shown always contain it.
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [view, setView] = useState<View>('week');
  const narrow = useNarrow();
  const [weekends, setWeekends] = useState(
    () => new Date().getDay() === 0 || new Date().getDay() === 6,
  );
  const [inboxOpen, setInboxOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    id: string;
    onlyIfLost: boolean;
  } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [deleted, setDeleted] = useState<{ task: Task; index: number } | null>(
    null,
  );
  const today = dateKey(new Date());
  const selected = parseDate(selectedDay);
  const week = weekStart(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const month = monthDays(selected);
  const monthKeys = month.map(dateKey);
  const dayKeys = days.map(dateKey);
  const weekendTasks = state.tasks.filter((task) =>
    dayKeys.slice(5).includes(task.date ?? ''),
  ).length;
  const currentTask = state.tasks.find((task) => task.id === editingId);
  const unscheduled = state.tasks.filter((task) => task.date === null);
  const openUnscheduled = unscheduled.filter((task) => !task.completed).length;
  const earlier = state.tasks.filter(
    (task) => task.date !== null && task.date < today && !task.completed,
  );
  const visibleDays = weekends ? days : days.slice(0, 5);
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
    Array.from(document.querySelectorAll<HTMLElement>('[data-task-id]'))
      .find((element) => element.dataset.taskId === focusRequest.id)
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
  // A week step selects that week's Monday; a month step keeps the day of the month where it exists.
  const goPeriod = (direction: number) => {
    setSelectedDay(
      dateKey(
        view === 'month'
          ? addMonths(selected, direction)
          : addDays(week, direction * 7),
      ),
    );
  };
  const goToday = () => {
    setSelectedDay(today);
    if ([0, 6].includes(new Date().getDay())) setWeekends(true);
    setInboxOpen(false);
  };
  // Bring a date into view so a moved task stays visible.
  const showDate = (date: string) => {
    if ([0, 6].includes(parseDate(date).getDay())) setWeekends(true);
    setSelectedDay(date);
    setInboxOpen(false);
  };
  // Week view reveals weekends when the selected date falls on one, so the date stays visible.
  const switchView = (next: View) => {
    setView(next);
    if (next === 'week') showDate(selectedDay);
    else setInboxOpen(false);
  };
  // Like showDate, but also opens the Unscheduled rail on mobile.
  const reveal = (date: string | null) => {
    if (date) showDate(date);
    else setInboxOpen(true);
  };
  const moveTo = (task: Task, date: string | null, follow: boolean) => {
    const moved = moveTask(state.tasks, task.id, date);
    setState((current) => ({ ...current, tasks: moved }));
    const kept = moved.find((item) => item.id === task.id)?.main;
    const label = date ? shortDate.format(parseDate(date)) : 'Unscheduled';
    const outOfView =
      !follow &&
      date !== null &&
      !(view === 'month' ? monthKeys : visibleDays.map(dateKey)).includes(date);
    if (task.main && !kept)
      announce(`Moved to ${label}. That day already has a main outcome.`, true);
    else announce(`Moved to ${label}.`, outOfView);
    if (follow && date) showDate(date);
    setFocusRequest({ id: task.id, onlyIfLost: !follow });
  };
  const reorder = (id: string, direction: -1 | 1) => {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return false;
    const siblings = state.tasks.filter((item) => item.date === task.date);
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
  const renderList = (tasks: Task[], date: string | null) => (
    <ul
      className={`task-list ${draggingId && dropTarget?.date === date && !dropTarget.beforeId ? 'drop-end' : ''}`}
    >
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          goalTitle={state.goals.find((goal) => goal.id === task.goalId)?.title}
          task={task}
          dropBefore={
            !!draggingId &&
            draggingId !== task.id &&
            dropTarget?.beforeId === task.id
          }
          onToggle={() => editTask(task.id, { completed: !task.completed })}
          onEdit={() => setEditingId(task.id)}
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
          `Replace this planner with ${backup.tasks.length} tasks and ${backup.goals.length} goals from this backup? Export your current planner first if you want to keep it.`,
        )
      ) {
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

  const inbox: ReactNode = (
    <aside
      className={`inbox ${inboxOpen ? 'mobile-open' : ''} ${draggingId && dropTarget?.date === null ? 'drop-active' : ''}`}
      aria-label="Unscheduled tasks"
      {...dropProps(null)}
    >
      {earlier.length > 0 && (
        <section className="earlier" aria-labelledby="earlier-title">
          <h2 id="earlier-title">
            From earlier <span className="count">{earlier.length}</span>
          </h2>
          <p>Unfinished on a past day. Move, finish, or delete.</p>
          <ul>
            {earlier.map((task) => (
              <li
                key={task.id}
                className="earlier-task"
                draggable
                onDragStart={(event) => dragStart(event, task.id)}
                onDragEnd={clearDrag}
              >
                <button
                  className="earlier-open"
                  aria-label={`Open ${task.title}, from ${shortDate.format(parseDate(task.date!))}`}
                  onClick={() => setEditingId(task.id)}
                >
                  {task.title}
                  <small>{shortDate.format(parseDate(task.date!))}</small>
                </button>
                <button
                  className="chip"
                  aria-label={`Move ${task.title} to today`}
                  onClick={() => moveTo(task, today, false)}
                >
                  Today
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="inbox-heading">
        <h2>
          Unscheduled <span className="count">{openUnscheduled}</span>
        </h2>
        <button
          className="icon-button inbox-close"
          aria-label="Close unscheduled"
          onClick={() => setInboxOpen(false)}
        >
          <X size={17} />
        </button>
      </div>
      <CaptureField onAdd={(title) => addTask(title, null)} />
      {unscheduled.length > 0 ? (
        renderList(unscheduled, null)
      ) : (
        <p className="empty-note">Nothing unscheduled.</p>
      )}
    </aside>
  );
  const goalsPanel = (layout: 'strip' | 'side') => (
    <GoalsPanel
      goals={state.goals}
      tasks={state.tasks}
      disabled={readError}
      layout={layout}
      onOpenTask={setEditingId}
      onSave={(goal) =>
        setState((current) => ({
          ...current,
          goals: current.goals.some((item) => item.id === goal.id)
            ? current.goals.map((item) => (item.id === goal.id ? goal : item))
            : [...current.goals, goal],
        }))
      }
    />
  );
  const openCount = (key: string) =>
    state.tasks.filter((task) => task.date === key && !task.completed).length;
  // Mobile shows a compact date grid with the selected day's list below it.
  const monthArea: ReactNode = (
    <div className="month-area">
      <section
        className="month-calendar"
        aria-label={`${monthName.format(selected)} calendar`}
      >
        <div className="month-weekdays" aria-hidden="true">
          {month.slice(0, 7).map((day) => (
            <span key={dateKey(day)}>{shortDay.format(day)}</span>
          ))}
        </div>
        <div className="month-grid">
          {month.map((day) => {
            const key = dateKey(day);
            const tasks = state.tasks.filter((task) => task.date === key);
            const open = openCount(key);
            const label = `${dayName.format(day)} ${readableDate.format(day)}`;
            return (
              <section
                key={key}
                aria-label={label}
                className={`month-cell ${key === today ? 'today-cell' : ''} ${key < today ? 'past-cell' : ''} ${day.getMonth() !== selected.getMonth() ? 'other-month' : ''} ${key === selectedDay ? 'selected-cell' : ''} ${draggingId && dropTarget?.date === key ? 'drop-active' : ''}`}
                {...dropProps(key)}
              >
                <header className="month-cell-heading">
                  <button
                    className="month-date"
                    aria-pressed={key === selectedDay}
                    aria-label={`${label}${key === today ? ', today' : ''}${open ? `, ${open} open` : ''}`}
                    onClick={() => setSelectedDay(key)}
                  >
                    {day.getDate()}
                  </button>
                  {key === today && <span className="today-tag">Today</span>}
                  {narrow && open > 0 && <span className="day-dot" />}
                </header>
                {!narrow && renderList(tasks, key)}
                {!narrow && <DayComposer date={key} onAdd={addTask} />}
              </section>
            );
          })}
        </div>
      </section>
      {narrow && (
        <section
          className={`month-day ${draggingId && dropTarget?.date === selectedDay ? 'drop-active' : ''}`}
          aria-label={`Tasks for ${dayName.format(selected)} ${readableDate.format(selected)}`}
          {...dropProps(selectedDay)}
        >
          <header className="day-heading">
            <h2>
              <span className="day-name">{dayName.format(selected)}</span>
              <span className="day-number">
                {readableDate.format(selected)}
              </span>
            </h2>
            {selectedDay === today && <span className="today-tag">Today</span>}
            {openCount(selectedDay) > 0 && (
              <span className="day-count">{openCount(selectedDay)} open</span>
            )}
          </header>
          {renderList(
            state.tasks.filter((task) => task.date === selectedDay),
            selectedDay,
          )}
          <DayComposer key={selectedDay} date={selectedDay} onAdd={addTask} />
        </section>
      )}
      {goalsPanel('side')}
    </div>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">ultrafocussed</span>
        <div className="week-nav">
          <button
            className="icon-button"
            aria-label={`Previous ${view}`}
            onClick={() => goPeriod(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label={`Next ${view}`}
            onClick={() => goPeriod(1)}
          >
            <ChevronRight size={18} />
          </button>
          <h1>
            {view === 'month'
              ? monthName.format(selected)
              : rangeDate.formatRange(
                  visibleDays[0],
                  visibleDays[visibleDays.length - 1],
                )}
          </h1>
          <button className="text-button" onClick={goToday}>
            Today
          </button>
        </div>
        <div className="view-controls">
          <div className="view-toggle" role="group" aria-label="View">
            {(['week', 'month'] as const).map((option) => (
              <button
                key={option}
                aria-pressed={view === option}
                onClick={() => switchView(option)}
              >
                {option === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
          <button
            className="mobile-inbox-button"
            aria-expanded={inboxOpen}
            onClick={() => setInboxOpen(!inboxOpen)}
          >
            Unscheduled <span className="count">{openUnscheduled}</span>
            {earlier.length > 0 && (
              <span className="earlier-flag">{earlier.length} earlier</span>
            )}
          </button>
          {view === 'week' && (
            <label className="weekend-control">
              <input
                type="checkbox"
                checked={weekends}
                onChange={(e) => {
                  setWeekends(e.target.checked);
                  if (
                    !e.target.checked &&
                    dayKeys.slice(5).includes(selectedDay)
                  )
                    setSelectedDay(dayKeys[0]);
                }}
              />
              <span>
                Weekends
                {!weekends && weekendTasks > 0 ? ` (${weekendTasks})` : ''}
              </span>
            </label>
          )}
        </div>
        <div className="top-actions">
          <span
            className={`save-status ${saveError || readError ? 'save-failed' : ''}`}
          >
            {saveError || readError ? 'Not saved' : 'Saved locally'}
          </span>
          <button
            className="icon-button labelled"
            aria-label="Export backup"
            disabled={readError}
            onClick={exportBackup}
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          <button
            className="icon-button labelled"
            aria-label="Import backup"
            onClick={() => importRef.current?.click()}
          >
            <Upload size={16} />
            <span>Import</span>
          </button>
          <button
            className="icon-button"
            aria-label="Planner help"
            onClick={() => setHelpOpen(true)}
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </header>
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
      {view === 'week' && goalsPanel('strip')}
      <main>
        <span id="move-hint" hidden>
          Alt with arrow keys moves this task.
        </span>
        {view === 'week' && (
          <nav className="mobile-days" aria-label="Choose day">
            {visibleDays.map((day) => {
              const key = dateKey(day);
              return (
                <button
                  key={key}
                  className={`${selectedDay === key && !inboxOpen ? 'selected' : ''} ${today === key ? 'is-today' : ''}`}
                  aria-pressed={selectedDay === key && !inboxOpen}
                  aria-label={`${dayName.format(day)} ${readableDate.format(day)}${today === key ? ', today' : ''}`}
                  onClick={() => {
                    setSelectedDay(key);
                    setInboxOpen(false);
                  }}
                >
                  <span>{shortDay.format(day)}</span>
                  <strong>{day.getDate()}</strong>
                  <span
                    className="day-dot"
                    style={{
                      visibility: state.tasks.some(
                        (task) => task.date === key && !task.completed,
                      )
                        ? 'visible'
                        : 'hidden',
                    }}
                  />
                </button>
              );
            })}
          </nav>
        )}
        <fieldset className="planner-content" disabled={readError}>
          <div className={`board ${weekends ? 'with-weekends' : ''}`}>
            {inbox}
            {view === 'month' ? (
              monthArea
            ) : (
              <div className="days-grid">
                {visibleDays.map((day) => {
                  const key = dateKey(day);
                  const tasks = state.tasks.filter((task) => task.date === key);
                  const open = tasks.filter((task) => !task.completed).length;
                  const isToday = key === today;
                  return (
                    <section
                      key={key}
                      aria-label={`${dayName.format(day)} ${readableDate.format(day)}`}
                      className={`day-column ${isToday ? 'today-column' : ''} ${key < today ? 'past-column' : ''} ${key === selectedDay ? 'mobile-selected' : ''} ${draggingId && dropTarget?.date === key ? 'drop-active' : ''}`}
                      {...dropProps(key)}
                    >
                      <header className="day-heading">
                        <h2>
                          <span className="day-name">
                            {shortDay.format(day)}
                          </span>
                          <span className="day-number">{day.getDate()}</span>
                        </h2>
                        {isToday && <span className="today-tag">Today</span>}
                        {open > 0 && (
                          <span className="day-count">{open} open</span>
                        )}
                      </header>
                      {renderList(tasks, key)}
                      <DayComposer date={key} onAdd={addTask} />
                    </section>
                  );
                })}
              </div>
            )}
          </div>
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
          tasks={state.tasks}
          goals={state.goals}
          today={today}
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
          onReorder={(direction) => reorder(currentTask.id, direction)}
        />
      )}
      {helpOpen && <Help onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
