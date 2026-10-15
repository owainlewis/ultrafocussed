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
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Plus,
  Star,
  Target,
  Timer,
  Upload,
  X,
} from 'lucide-react';
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
  weekStart,
  finishFocus,
  remainingSeconds,
  type PlannerState,
  type Task,
  monthStart,
  addMonths,
  monthDays,
  removeGoal,
  type Goal,
} from './model';
import { MonthView, YearView, GoalsView } from './WarMapViews';

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
  dropBefore,
  focus,
  showPlanningDate,
  goalTitle,
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
  showPlanningDate: boolean;
  goalTitle: string;
  onToggle: () => void;
  onEdit: () => void;
  onFocus: () => void;
  onMoveKey: (key: string) => void;
  onDrop: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
}) {
  const note = (task.nextStep || task.notes).trim().split('\n')[0];
  return (
    <li
      className={`task ${task.completed ? 'completed' : ''} ${task.main ? 'main-task' : ''} ${focus === 'active' ? 'in-focus' : ''} ${dropBefore ? 'drop-before' : ''}`}
      draggable={!showPlanningDate}
      onDragStart={showPlanningDate ? undefined : onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={showPlanningDate ? undefined : onDragOver}
      onDrop={showPlanningDate ? undefined : onDrop}
    >
      {(task.main || focus === 'active') && (
        <span className="task-labels">
          {task.main && (
            <span className="outcome-label">
              <Star size={12} fill="currentColor" aria-hidden="true" /> Main
              outcome
            </span>
          )}
          {focus === 'active' && (
            <span className="focus-tag">
              <Timer size={12} aria-hidden="true" /> In focus
            </span>
          )}
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
          {showPlanningDate && (
            <button
              className="task-plan-date"
              onClick={onEdit}
              aria-label={`Schedule ${task.title}`}
            >
              {task.date ? shortDate.format(parseDate(task.date)) : 'Schedule'}
            </button>
          )}
          {!showPlanningDate && goalTitle && (
            <span className="task-goal">{goalTitle}</span>
          )}
          {note && (
            <p className="task-note">
              <span>{note}</span>
            </p>
          )}
        </div>
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
  tasks,
  today,
  onChange,
  onClose,
  onDelete,
  focusContent,
  goals,
  onFocus,
  focusActive,
}: {
  task: Task;
  tasks: Task[];
  focusContent: ReactNode;
  goals: Goal[];
  onFocus: (patch: Patch | null) => void;
  focusActive: boolean;
  today: string;
  onChange: (patch: Patch) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const dateId = useId();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [progressNotes, setProgressNotes] = useState(task.progressNotes ?? '');
  const [nextStep, setNextStep] = useState(task.nextStep ?? '');
  const [outcomeWeek, setOutcomeWeek] = useState(task.outcomeWeek ?? '');
  const [goalId, setGoalId] = useState(task.goalId ?? '');
  const [date, setDate] = useState(task.date ?? '');
  const [main, setMain] = useState(task.main);
  const dirty =
    title !== task.title ||
    notes !== task.notes ||
    progressNotes !== (task.progressNotes ?? '') ||
    nextStep !== (task.nextStep ?? '') ||
    outcomeWeek !== (task.outcomeWeek ?? '') ||
    goalId !== (task.goalId ?? '') ||
    date !== (task.date ?? '') ||
    main !== task.main;
  const previousTask = useRef(task);
  const hadFocus = useRef(!!focusContent);
  useEffect(() => {
    const before = previousTask.current;
    setTitle((current) => (current === before.title ? task.title : current));
    setNotes((current) => (current === before.notes ? task.notes : current));
    setProgressNotes((current) =>
      current === (before.progressNotes ?? '')
        ? (task.progressNotes ?? '')
        : current,
    );
    setNextStep((current) =>
      current === (before.nextStep ?? '') ? (task.nextStep ?? '') : current,
    );
    setOutcomeWeek((current) =>
      current === (before.outcomeWeek ?? '')
        ? (task.outcomeWeek ?? '')
        : current,
    );
    setGoalId((current) =>
      current === (before.goalId ?? '') ? (task.goalId ?? '') : current,
    );
    setDate((current) =>
      current === (before.date ?? '') ? (task.date ?? '') : current,
    );
    setMain((current) => (current === before.main ? task.main : current));
    previousTask.current = task;
  }, [task]);
  useEffect(() => {
    if (hadFocus.current && !focusContent) titleRef.current?.focus();
    hadFocus.current = !!focusContent;
  }, [!!focusContent]);
  useModal(dialog, () => {
    const setup =
      dialog.current?.querySelector<HTMLInputElement>('.focus-step input');
    const session = dialog.current?.querySelector<HTMLElement>('.focus-panel');
    const finish = dialog.current?.querySelector<HTMLButtonElement>(
      '.focus-review .primary-button',
    );
    if (setup) setup.focus();
    else if (finish) finish.focus();
    else if (session) session.focus();
    else titleRef.current?.focus();
  });
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
  const patch = (): Patch => ({
    title: title.trim(),
    notes,
    progressNotes,
    nextStep,
    outcomeWeek: outcomeWeek || null,
    goalId: goalId || null,
    date: date || null,
    main: date ? main : false,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onChange(patch());
    if (!focusContent) onClose();
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
          <label className="field">
            Next step <span className="optional">Optional</span>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="What will you do first?"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
            />
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
          <label className="field">
            Progress notes <span className="optional">Optional</span>
            <textarea
              rows={3}
              maxLength={10000}
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
            />
          </label>
          {!!task.sessions?.length && (
            <section className="progress-history" aria-label="Progress history">
              <h3>Progress</h3>
              {[...task.sessions].reverse().map((entry) => (
                <article key={entry.id}>
                  <p>{entry.progress || 'Focus session'}</p>
                  <small>
                    {new Date(entry.endedAt).toLocaleString()} ·{' '}
                    {Math.round(entry.minutes)} min focused
                  </small>
                </article>
              ))}
            </section>
          )}
          <div className="panel-footer">
            {(focusActive || task.completed) && (
              <small className="optional footer-note">
                {focusActive
                  ? 'Finish the current session before starting another.'
                  : 'Reopen this task to focus on it.'}
              </small>
            )}
            <button type="button" className="delete-button" onClick={onDelete}>
              Delete task
            </button>
            <span className="footer-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={!title.trim() || task.completed || focusActive}
                onClick={() => onFocus(dirty ? patch() : null)}
              >
                <Timer size={14} aria-hidden="true" />
                {dirty ? 'Save and start focus' : 'Start focus'}
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={!title.trim()}
              >
                Save changes
              </button>
            </span>
          </div>
        </form>
        {focusContent}
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
        <li>
          Use Year for an overview, Month to schedule work, and Goals to list
          actions under up to four goals per year. Keep your notes and focus
          sessions in task details. Choose the timer on any open task to focus
          on it: add a next step, set the minutes, and begin. Stop early
          whenever you like. Keep progress notes in task details.
        </li>
        <li>Type in Unscheduled and press Enter to capture a task.</li>
        <li>
          Drag a task to another day or position. With the keyboard, focus a
          task and press Alt (Option) with Up or Down to reorder, or Left or
          Right to move it a day.
        </li>
        <li>
          Open a task to edit its notes, pick a date, link it to a goal, make it
          the day’s main outcome, or read its progress.
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

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

type FocusMode = 'setup' | 'running' | 'review';

// One strip above the board carries the whole loop: set up, run, and review.
function FocusPanel({
  task,
  session,
  outcome,
  onStart,
  onStop,
  onCancel,
  onFinish,
}: {
  task: Task;
  session?: PlannerState['focus'];
  // Title of this task’s goal, if any.
  outcome: string;
  onStart: (duration: number, patch: Patch) => void;
  onStop: () => void;
  onCancel: () => void;
  onFinish: (progress: string, completed: boolean, nextStep: string) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [minutes, setMinutes] = useState('60');
  const [nextStep, setNextStep] = useState(task.nextStep ?? '');
  const [completed, setCompleted] = useState(task.completed);
  const panel = useRef<HTMLElement>(null);
  const stepRef = useRef<HTMLInputElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const previous = useRef<FocusMode | null>(null);
  const reviewEdits = useRef({ nextStep: false, completed: false });
  const seconds = session ? remainingSeconds(session, now) : 0;
  const mode: FocusMode = !session
    ? 'setup'
    : session.stoppedAt !== undefined || seconds === 0
      ? 'review'
      : 'running';
  const duration = Number(minutes);
  const validMinutes =
    Number.isInteger(duration) && duration >= 1 && duration <= 180;
  useEffect(() => {
    if (mode !== 'running') return;
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [mode]);
  // Move focus with the loop, but never pull it out of unrelated work when
  // a timer runs out on its own.
  useEffect(() => {
    const before = previous.current;
    previous.current = mode;
    if (before === mode) return;
    const active = document.activeElement;
    const idle =
      !active || active === document.body || !!panel.current?.contains(active);
    if (mode === 'setup') stepRef.current?.focus();
    else if (mode === 'running' && before === 'setup') panel.current?.focus();
    else if (mode === 'review') {
      setCompleted(task.completed);
      setNextStep(task.nextStep ?? '');
      if (idle) finishRef.current?.focus();
    }
  }, [mode]);
  useEffect(() => {
    if (mode !== 'review') return;
    if (!reviewEdits.current.nextStep) setNextStep(task.nextStep ?? '');
    if (!reviewEdits.current.completed) setCompleted(task.completed);
  }, [mode, task.nextStep, task.completed]);
  const begin = (event: FormEvent) => {
    event.preventDefault();
    if (!validMinutes) return;
    const patch: Patch = {};
    if (nextStep !== (task.nextStep ?? '')) patch.nextStep = nextStep.trim();
    onStart(duration, patch);
  };
  const step = (task.nextStep ?? '').trim();
  return (
    <section
      ref={panel}
      tabIndex={-1}
      className={`focus-panel focus-${mode}`}
      aria-label="Focus session"
    >
      <div className="focus-bar">
        <div className="focus-summary">
          <span className="focus-label">
            <Timer size={13} aria-hidden="true" />
            {mode === 'setup'
              ? 'Focus on'
              : mode === 'running'
                ? 'Focusing on'
                : 'Session ended'}
          </span>
          <h2 className="focus-task" title={task.title}>
            {task.title}
          </h2>
          {mode === 'running' && step && (
            <p className="focus-next" title={step}>
              <span>Next step:</span> {step}
            </p>
          )}
          {outcome && (
            <p className="focus-outcome" title={outcome}>
              <Target size={12} aria-hidden="true" />
              <span>{outcome}</span>
            </p>
          )}
        </div>
        {mode === 'running' && (
          <div className="focus-controls">
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
        )}
        {mode === 'setup' && (
          <button className="text-button focus-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      {mode === 'setup' && (
        <form className="focus-start" onSubmit={begin}>
          <label className="focus-field focus-step">
            <span>
              Next step <span className="optional">Optional</span>
            </span>
            <input
              ref={stepRef}
              maxLength={500}
              placeholder="What will you do first?"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
            />
          </label>
          <label className="focus-field focus-minutes">
            <span>Minutes</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              step={1}
              required
              aria-invalid={!validMinutes}
              aria-describedby="focus-minutes-hint"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <button className="primary-button" disabled={!validMinutes}>
            Begin session
          </button>
          <small
            id="focus-minutes-hint"
            className={validMinutes ? 'visually-hidden' : 'focus-error'}
          >
            Choose 1 to 180 minutes.
          </small>
        </form>
      )}
      {mode === 'review' && (
        <form
          className="focus-review"
          onSubmit={(e) => {
            e.preventDefault();
            onFinish('', completed, nextStep);
          }}
        >
          <p className="visually-hidden" role="status">
            Session finished. Notes stay on the task.
          </p>
          <div className="focus-after">
            <label className="focus-complete">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => {
                  reviewEdits.current.completed = true;
                  setCompleted(e.target.checked);
                }}
              />
              Task complete
            </label>
            {!completed && (
              <label className="focus-field">
                Next step
                <textarea
                  rows={1}
                  maxLength={500}
                  value={nextStep}
                  onChange={(e) => {
                    reviewEdits.current.nextStep = true;
                    setNextStep(e.target.value);
                  }}
                />
              </label>
            )}
          </div>
          <button ref={finishRef} className="primary-button">
            Finish session
          </button>
        </form>
      )}
    </section>
  );
}

export default function App() {
  const [initial] = useState(initialData);
  const [now, setNow] = useState(Date.now());
  const [state, setState] = useState<PlannerState>(initial.state);
  const [readError, setReadError] = useState(initial.error);
  const [saveError, setSaveError] = useState(false);
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [view, setView] = useState<'year' | 'month' | 'goals'>('month');
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [inboxOpen, setInboxOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
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
  const days = monthDays(month);
  const currentTask = state.tasks.find((task) => task.id === editingId);
  const unscheduled = state.tasks.filter((task) => task.date === null);
  const openUnscheduled = unscheduled.filter((task) => !task.completed).length;
  const earlier = state.tasks.filter(
    (task) => task.date !== null && task.date < today && !task.completed,
  );
  const visibleDays = days;
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
  const goPeriod = (direction: number) => {
    const next = addMonths(month, direction * (view === 'month' ? 1 : 12));
    setMonth(next);
    setSelectedDay(dateKey(next));
  };
  const goToday = () => {
    setMonth(monthStart(new Date()));
    setSelectedDay(today);
    setInboxOpen(false);
  };
  const showDate = (date: string) => {
    const day = parseDate(date);
    setMonth(monthStart(day));
    setView('month');
    setSelectedDay(date);
    setInboxOpen(false);
  };
  // Like showDate, but also opens the Unscheduled rail on mobile.
  const reveal = (date: string | null) => {
    if (date) showDate(date);
    else {
      setView('month');
      setInboxOpen(true);
    }
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
    if (follow && date) showDate(date);
    setFocusRequest({ id: task.id, onlyIfLost: !follow });
  };
  const reorder = (id: string, direction: -1 | 1) => {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return false;
    const siblings = state.tasks.filter((item) =>
      view === 'goals' ? item.goalId === task.goalId : item.date === task.date,
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
    showPlanningDate = false,
  ) => (
    <ul
      className={`task-list ${draggingId && dropTarget?.date === date && !dropTarget.beforeId ? 'drop-end' : ''}`}
    >
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          goalTitle={
            (state.goals ?? []).find((goal) => goal.id === task.goalId)
              ?.title ?? ''
          }
          showPlanningDate={showPlanningDate}
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
          onToggle={() => editTask(task.id, { completed: !task.completed })}
          onEdit={() => setEditingId(task.id)}
          onFocus={() => {
            if (!state.focus) setFocusTaskId(task.id);
            setEditingId(task.id);
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
      outcome={
        (state.goals ?? []).find((goal) => goal.id === focusTask.goalId)
          ?.title ?? ''
      }
      onStart={(duration, patch) => {
        setState((current) => ({
          ...current,
          tasks: updateTask(current.tasks, focusTask.id, patch),
          focus: {
            taskId: focusTask.id,
            startedAt: Date.now(),
            duration,
          },
        }));
        setFocusTaskId(null);
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
      onCancel={() => {
        setFocusTaskId(null);
      }}
      onFinish={(progress, completed, nextStep) => {
        setFocusTaskId(null);
        setState((current) =>
          finishFocus(current, progress, completed, nextStep, Date.now()),
        );
        // Return to the task so the next step is one keypress away.
        reveal(focusTask.date);
        announce('Session saved.');
      }}
    />
  );

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">ultrafocussed</span>
        <div className="week-nav">
          <button
            className="icon-button"
            aria-label={view === 'month' ? 'Previous month' : 'Previous year'}
            onClick={() => goPeriod(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label={view === 'month' ? 'Next month' : 'Next year'}
            onClick={() => goPeriod(1)}
          >
            <ChevronRight size={18} />
          </button>
          <h1>
            {view === 'month'
              ? new Intl.DateTimeFormat(undefined, {
                  month: 'long',
                  year: 'numeric',
                }).format(month)
              : month.getFullYear()}
          </h1>
          <button className="text-button" onClick={goToday}>
            Today
          </button>
        </div>
        <nav className="view-switch" aria-label="Planner view">
          {(['year', 'month', 'goals'] as const).map((mode) => (
            <button
              key={mode}
              aria-pressed={view === mode}
              onClick={() => {
                setView(mode);
                setInboxOpen(false);
              }}
            >
              {mode === 'year' ? 'Year' : mode === 'month' ? 'Month' : 'Goals'}
            </button>
          ))}
        </nav>
        {view === 'month' && (
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
        )}
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
      <main>
        <span id="move-hint" hidden>
          Alt with arrow keys moves this task.
        </span>
        <fieldset
          className={`planner-content war-map-content view-${view}`}
          disabled={readError}
        >
          {view === 'month' ? (
            <div className="board month-board">
              {inbox}
              <div
                className={
                  inboxOpen ? 'month-calendar mobile-hidden' : 'month-calendar'
                }
              >
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
          ) : (
            <GoalsView
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
              onDelete={(id) => {
                if (
                  window.confirm(
                    'Remove this goal? Its actions and dates will be kept.',
                  )
                )
                  setState((current) => removeGoal(current, id));
              }}
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
          today={today}
          goals={state.goals ?? []}
          focusContent={focusTask?.id === currentTask.id ? focusContent : null}
          focusActive={!!state.focus}
          onFocus={(patch) => {
            if (patch) {
              editTask(currentTask.id, patch);
              if (patch.date !== currentTask.date) reveal(patch.date ?? null);
            }
            setFocusTaskId(currentTask.id);
          }}
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
      {helpOpen && <Help onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
