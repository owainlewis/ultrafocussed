import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  GripVertical,
  Inbox,
  MoreHorizontal,
  Plus,
  Star,
  Trash2,
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
  type PlannerState,
  type Task,
} from './model';

const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const shortDay = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' });
const readableDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
});
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

function TaskComposer({
  date,
  onAdd,
  prominent = false,
}: {
  date: string | null;
  onAdd: (title: string, date: string | null) => void;
  prominent?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), date);
    setTitle('');
    input.current?.focus();
  };
  if (!editing)
    return (
      <button
        className={`add-task ${prominent ? 'prominent' : ''}`}
        onClick={() => setEditing(true)}
      >
        <Plus size={15} />
        <span>Add task</span>
      </button>
    );
  return (
    <form className="composer" onSubmit={submit}>
      <input
        ref={input}
        aria-label={`New task for ${date ? readableDate.format(parseDate(date)) : 'unscheduled'}`}
        placeholder="What needs doing?"
        value={title}
        maxLength={300}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setEditing(false);
            setTitle('');
          }
        }}
      />
      <div className="composer-actions">
        <span>Enter to add</span>
        <button
          type="button"
          className="icon-button"
          aria-label="Close task entry"
          onClick={() => {
            setEditing(false);
            setTitle('');
          }}
        >
          <X size={14} />
        </button>
        <button className="small-primary" disabled={!title.trim()}>
          Add
        </button>
      </div>
    </form>
  );
}

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDrop,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDrop: (event: DragEvent) => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <article
      className={`task-card ${task.completed ? 'completed' : ''} ${task.main ? 'main-task' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {task.main && (
        <div className="outcome-label">
          <Star size={11} fill="currentColor" /> Main outcome
        </div>
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
        <button className="task-title" onClick={onEdit}>
          {task.title}
        </button>
        <button
          className="task-more icon-button"
          aria-label={`Edit ${task.title}`}
          onClick={onEdit}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
      {task.notes && <p className="task-note">{task.notes.split('\n')[0]}</p>}
      <GripVertical className="drag-handle" size={13} aria-hidden="true" />
    </article>
  );
}

function DetailPanel({
  task,
  tasks,
  onChange,
  onClose,
  onDelete,
  onReorder,
}: {
  task: Task;
  tasks: Task[];
  onChange: (patch: Partial<Omit<Task, 'id'>>) => void;
  onClose: () => void;
  onDelete: () => void;
  onReorder: (direction: -1 | 1) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [date, setDate] = useState(task.date ?? '');
  const [main, setMain] = useState(task.main);
  const siblings = tasks.filter((item) => item.date === task.date);
  const index = siblings.findIndex((item) => item.id === task.id);
  const dirty =
    title !== task.title ||
    notes !== task.notes ||
    date !== (task.date ?? '') ||
    main !== task.main;
  useEffect(() => {
    dialog.current?.showModal();
    titleRef.current?.focus();
  }, []);
  const close = () => {
    if (dirty && !window.confirm('Discard your unsaved task changes?')) return;
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onChange({
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
              rows={3}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            Plan for
            <input
              type="date"
              value={date}
              min="0001-01-01"
              max="9999-12-31"
              onInput={(e) => {
                setDate(e.currentTarget.value);
                if (!e.currentTarget.value) setMain(false);
              }}
            />
            <span className="field-help">
              A day to work on it. Leave blank for unscheduled.
            </span>
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
              <Star size={17} />
            </label>
          )}
          <label className="field">
            Notes <span className="optional">Optional</span>
            <textarea
              placeholder="Anything you need to remember…"
              rows={6}
              maxLength={10000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="order-controls">
            <span>Order in this list</span>
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
              <Trash2 size={15} /> Delete task
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

function Help({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="help-dialog"
      aria-labelledby="help-title"
      onCancel={onClose}
    >
      <button
        className="icon-button help-close"
        aria-label="Close planner help"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <h2 id="help-title">A little room to focus.</h2>
      <p>
        Capture anything in Unscheduled. Give it a day when you’re ready. Choose
        one main outcome and let the rest follow.
      </p>
      <ul>
        <li>Drag tasks between days or into a different order.</li>
        <li>
          Open a task to edit notes, choose a date, or move it up and down with
          your keyboard.
        </li>
        <li>
          Unfinished tasks stay on their original day until you decide where
          they go next.
        </li>
      </ul>
      <p className="help-storage">
        Your planner is saved in this browser on this device. Clearing site data
        clears your tasks. Export a backup whenever you need one.
      </p>
      <button className="primary-button" onClick={onClose}>
        Got it
      </button>
    </dialog>
  );
}

export default function App() {
  const [initial] = useState(initialData);
  const [state, setState] = useState<PlannerState>(initial.state);
  const [readError, setReadError] = useState(initial.error);
  const [saveError, setSaveError] = useState(false);
  const [week, setWeek] = useState(() => weekStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [weekends, setWeekends] = useState(
    () => new Date().getDay() === 0 || new Date().getDay() === 6,
  );
  const [inboxOpen, setInboxOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null | undefined>();
  const [notice, setNotice] = useState('');
  const [deleted, setDeleted] = useState<{ task: Task; index: number } | null>(
    null,
  );
  const today = dateKey(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const weekendTasks = state.tasks.filter((task) =>
    days.slice(5).some((day) => task.date === dateKey(day)),
  ).length;
  const currentTask = state.tasks.find((task) => task.id === editingId);
  const unscheduled = state.tasks.filter((task) => task.date === null);
  const earlier = state.tasks.filter(
    (task) => task.date !== null && task.date < today && !task.completed,
  );
  const visibleDays = weekends ? days : days.slice(0, 5);
  const scheduledWeek = state.tasks.filter((task) =>
    days.some((day) => dateKey(day) === task.date),
  );
  const done = scheduledWeek.filter((task) => task.completed).length;

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
        setNotice('Planner updated from another tab.');
      } catch {
        setReadError(true);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [readError, saveError]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const setTasks = (change: (tasks: Task[]) => Task[]) =>
    setState((current) => ({ ...current, tasks: change(current.tasks) }));
  const addTask = (title: string, date: string | null) => {
    setTasks((tasks) => [...tasks, createTask(title, date)]);
    setNotice(`Added “${title}”.`);
  };
  const editTask = (id: string, patch: Partial<Omit<Task, 'id'>>) =>
    setTasks((tasks) => updateTask(tasks, id, patch));
  const goWeek = (direction: number) => {
    const next = addDays(week, direction * 7);
    setWeek(next);
    setSelectedDay(dateKey(next));
  };
  const goToday = () => {
    setWeek(weekStart(new Date()));
    setSelectedDay(today);
    if ([0, 6].includes(new Date().getDay())) setWeekends(true);
    setInboxOpen(false);
  };
  const onDrop = (event: DragEvent, date: string | null, beforeId?: string) => {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData('text/plain');
    if (state.tasks.some((task) => task.id === id)) {
      setTasks((tasks) => moveTask(tasks, id, date, beforeId));
      setNotice('Task moved.');
    }
    setDraggingId(null);
    setDropDate(undefined);
  };
  const renderTask = (task: Task) => (
    <TaskCard
      key={task.id}
      task={task}
      onToggle={() => editTask(task.id, { completed: !task.completed })}
      onEdit={() => setEditingId(task.id)}
      onDrop={(event) => onDrop(event, task.date, task.id)}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
        setDraggingId(task.id);
      }}
      onDragEnd={() => {
        setDraggingId(null);
        setDropDate(undefined);
      }}
    />
  );
  const dropProps = (date: string | null) => ({
    onDragOver: (event: DragEvent) => {
      if (draggingId) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropDate(date);
      }
    },
    onDrop: (event: DragEvent) => onDrop(event, date),
  });
  const retrySave = () => {
    try {
      if (readError) {
        setState(decodeState(localStorage.getItem(STORAGE_KEY)));
        setReadError(false);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSaveError(false);
      }
      setNotice('Planner saved.');
    } catch {
      setNotice(
        'Storage is still unavailable. Export a backup to keep your work.',
      );
    }
  };
  const exportBackup = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `ultrafocussed-${today}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Planner backup exported.');
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
        setState(backup);
        setReadError(false);
        setEditingId(null);
        setDeleted(null);
        setNotice('Planner restored from backup.');
      }
    } catch {
      setNotice(
        'Could not import this file. Choose an Ultrafocussed JSON backup under 10 MB.',
      );
    }
    if (importRef.current) importRef.current.value = '';
  };

  const inbox: ReactNode = (
    <aside
      className={`inbox ${inboxOpen ? 'mobile-open' : ''} ${draggingId && dropDate === null ? 'drop-active' : ''}`}
      aria-label="Unscheduled tasks"
      {...dropProps(null)}
    >
      <div className="inbox-heading">
        <div>
          <Inbox size={17} />
          <h2>Unscheduled</h2>
          <span className="count">
            {unscheduled.filter((task) => !task.completed).length}
          </span>
        </div>
        <button
          className="icon-button inbox-close"
          aria-label="Close unscheduled"
          onClick={() => setInboxOpen(false)}
        >
          <X size={17} />
        </button>
      </div>
      <p className="inbox-description">
        A place for everything.
        <br />
        Give it a day when you’re ready.
      </p>
      <div className="task-list">{unscheduled.map(renderTask)}</div>
      <TaskComposer date={null} onAdd={addTask} />
      {unscheduled.length === 0 && (
        <div className="inbox-empty">
          <div className="empty-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>
            Get it out of your head.
            <br />
            Your week can wait a moment.
          </p>
        </div>
      )}
      {earlier.length > 0 && (
        <section className="earlier">
          <h3>
            Needs a decision <span className="count">{earlier.length}</span>
          </h3>
          <p>Unfinished from earlier days.</p>
          {earlier.map((task) => (
            <button
              key={task.id}
              className="earlier-task"
              onClick={() => setEditingId(task.id)}
            >
              <span>
                {task.title}
                <small>{readableDate.format(parseDate(task.date!))}</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </section>
      )}
      <div className="inbox-footnote">
        <span className="little-dot" /> Less on your list. More on your mind.
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="./" aria-label="Ultrafocussed planner">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          ultrafocussed<span className="brand-period">.</span>
        </a>
        <div className="header-right">
          <span
            className={`save-status ${saveError || readError ? 'save-failed' : ''}`}
          >
            <span className="little-dot" />
            {saveError || readError ? 'Not saved' : 'Saved on this device'}
          </span>
          <button
            className="icon-button"
            aria-label="Planner help"
            onClick={() => setHelpOpen(true)}
          >
            <CircleHelp size={19} />
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
          <button onClick={exportBackup}>Export backup</button>
          {readError && (
            <button onClick={() => importRef.current?.click()}>
              Restore backup
            </button>
          )}
        </div>
      )}
      <main>
        <fieldset className="planner-content" disabled={readError}>
          <div className="page-heading">
            <div>
              <h1>Your week, with intention.</h1>
              <p>A little structure. A little space. Focus on what matters.</p>
            </div>
            <div className="week-summary">
              <span>
                {scheduledWeek.length
                  ? `${done} of ${scheduledWeek.length} done`
                  : 'A fresh week'}
              </span>
              <span className="summary-line" aria-hidden="true">
                <span
                  style={{
                    width: `${scheduledWeek.length ? (done / scheduledWeek.length) * 100 : 0}%`,
                  }}
                />
              </span>
            </div>
          </div>
          <div className="planner-toolbar">
            <div className="week-navigation">
              <div className="arrow-group">
                <button
                  className="icon-button"
                  aria-label="Previous week"
                  onClick={() => goWeek(-1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next week"
                  onClick={() => goWeek(1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <h2>
                {monthName.format(week)}
                {week.getMonth() !== days[6].getMonth() &&
                  ` – ${monthName.format(days[6])}`}{' '}
                <span>
                  {week.getFullYear()}
                  {week.getFullYear() !== days[6].getFullYear() &&
                    ` / ${days[6].getFullYear()}`}
                </span>
              </h2>
              <button className="today-button" onClick={goToday}>
                Today
              </button>
            </div>
            <div className="view-controls">
              <button
                className="mobile-inbox-button secondary-button"
                aria-expanded={inboxOpen}
                onClick={() => setInboxOpen(!inboxOpen)}
              >
                <Inbox size={15} />
                Unscheduled{' '}
                <span>
                  {unscheduled.filter((task) => !task.completed).length}
                </span>
              </button>
              <label className="weekend-control">
                <input
                  type="checkbox"
                  checked={weekends}
                  onChange={(e) => {
                    setWeekends(e.target.checked);
                    if (
                      !e.target.checked &&
                      days.slice(5).some((day) => dateKey(day) === selectedDay)
                    )
                      setSelectedDay(dateKey(week));
                  }}
                />
                <span>
                  Weekends
                  {!weekends && weekendTasks > 0 ? ` (${weekendTasks})` : ''}
                </span>
              </label>
            </div>
          </div>
          <nav className="mobile-days" aria-label="Choose day">
            {visibleDays.map((day) => (
              <button
                key={dateKey(day)}
                className={`${selectedDay === dateKey(day) ? 'selected' : ''} ${today === dateKey(day) ? 'is-today' : ''}`}
                aria-pressed={selectedDay === dateKey(day)}
                onClick={() => {
                  setSelectedDay(dateKey(day));
                  setInboxOpen(false);
                }}
              >
                <span>{shortDay.format(day)}</span>
                <strong>{day.getDate()}</strong>
                <span
                  className="day-dot"
                  style={{
                    visibility: state.tasks.some(
                      (task) => task.date === dateKey(day),
                    )
                      ? 'visible'
                      : 'hidden',
                  }}
                />
              </button>
            ))}
          </nav>
          <div className={`planner-board ${weekends ? 'with-weekends' : ''}`}>
            {inbox}
            <div className="days-grid">
              {visibleDays.map((day) => {
                const key = dateKey(day);
                const tasks = state.tasks.filter((task) => task.date === key);
                const isToday = key === today;
                return (
                  <section
                    key={key}
                    aria-label={`${dayName.format(day)} ${readableDate.format(day)}`}
                    className={`day-column ${isToday ? 'today-column' : ''} ${key === selectedDay ? 'mobile-selected' : ''} ${draggingId && dropDate === key ? 'drop-active' : ''}`}
                    {...dropProps(key)}
                  >
                    <header className="day-heading">
                      <div>
                        <h3>{dayName.format(day)}</h3>
                        <span
                          className={`day-number ${isToday ? 'today-number' : ''}`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                      <span className="day-count">
                        {isToday
                          ? 'Today'
                          : `${tasks.filter((task) => !task.completed).length} ${tasks.filter((task) => !task.completed).length === 1 ? 'task' : 'tasks'}`}
                      </span>
                    </header>
                    <div className="task-list">{tasks.map(renderTask)}</div>
                    <TaskComposer date={key} onAdd={addTask} />
                    {tasks.length === 0 && (
                      <div className="day-empty">
                        <span className="empty-dash" />
                        {isToday
                          ? 'What matters today?'
                          : 'Room to make progress.'}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
          <footer className="board-footer">
            <span>
              <GripVertical size={13} />
              Drag to plan. Click a task to make it yours.
            </span>
            <div>
              <button onClick={exportBackup}>Export backup</button>
              <span aria-hidden="true">·</span>
              <button onClick={() => importRef.current?.click()}>
                Import backup
              </button>
            </div>
          </footer>
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
                setNotice('Task restored.');
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
          notice && (
            <div className="toast">
              <Check size={15} />
              <span>{notice}</span>
            </div>
          )
        )}
      </div>
      {currentTask && (
        <DetailPanel
          key={currentTask.id}
          task={currentTask}
          tasks={state.tasks}
          onClose={() => setEditingId(null)}
          onChange={(patch) => {
            editTask(currentTask.id, patch);
            setNotice('Task updated.');
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
          onReorder={(direction) => {
            const siblings = state.tasks.filter(
              (task) => task.date === currentTask.date,
            );
            const index = siblings.findIndex(
              (task) => task.id === currentTask.id,
            );
            const neighbour = siblings[index + direction];
            if (!neighbour) return;
            setTasks((tasks) => {
              const next = [...tasks];
              const from = next.findIndex((task) => task.id === currentTask.id);
              const to = next.findIndex((task) => task.id === neighbour.id);
              [next[from], next[to]] = [next[to], next[from]];
              return next;
            });
            setNotice('Task order updated.');
          }}
        />
      )}
      {helpOpen && <Help onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
