import {
  useEffect,
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import {
  addDays,
  dateKey,
  parseDate,
  startChecklistWeek,
  logRoutineProgress,
  routineEntries,
  routineProgress,
  weekStart,
  type PlannerState,
  type WeeklyRoutine,
} from './model';

export function WeeklyView({
  state,
  onChange,
  today,
}: {
  state: PlannerState;
  onChange: Dispatch<SetStateAction<PlannerState>>;
  today: string;
}) {
  const currentWeek = dateKey(weekStart(parseDate(today)));
  const [week, setWeek] = useState(currentWeek);
  const [editor, setEditor] = useState<WeeklyRoutine | 'new' | null>(null);
  const [logging, setLogging] = useState<WeeklyRoutine | null>(null);
  const [removing, setRemoving] = useState<WeeklyRoutine | null>(null);
  // Only the current week is created automatically. Browsing history never invents missed work.
  useEffect(() => {
    onChange((value) => startChecklistWeek(value, currentWeek));
  }, [currentWeek, onChange]);
  const days = Array.from({ length: 7 }, (_, index) =>
    dateKey(addDays(parseDate(week), index)),
  );
  const rows = state.routineWeeks?.[week];
  const addButton = useRef<HTMLButtonElement>(null);
  const focusAfterRemove = useRef(false);
  const focusLog = useRef<string | null>(null);
  useEffect(() => {
    if (!focusLog.current) return;
    Array.from(document.querySelectorAll<HTMLElement>('[data-routine-log]'))
      .find((item) => item.dataset.routineLog === focusLog.current)
      ?.focus();
    focusLog.current = null;
  }, [state.tasks]);
  useEffect(() => {
    if (focusAfterRemove.current) {
      addButton.current?.focus();
      focusAfterRemove.current = false;
    }
  }, [rows]);
  const reopen = (id: string, routineId: string) => {
    focusLog.current = routineId;
    onChange((value) => ({
      ...value,
      tasks: value.tasks.map((task) =>
        task.id === id
          ? { ...task, completed: false, completedOn: null }
          : task,
      ),
    }));
  };
  const format = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, options).format(parseDate(day));
  const save = (title: string, target: number, daily: boolean) => {
    onChange((value) => {
      const id = editor && editor !== 'new' ? editor.id : crypto.randomUUID();
      const routine = { id, title, target, daily };
      const routines = value.routines ?? [];
      const updateTemplate = week >= currentWeek;
      return {
        ...value,
        routines: routines.some((item) => item.id === id)
          ? routines.map((item) =>
              item.id === id && updateTemplate ? { ...item, ...routine } : item,
            )
          : [...routines, { ...routine, archived: !updateTemplate }],
        routineWeeks: {
          ...value.routineWeeks,
          [week]:
            editor === 'new'
              ? [...(value.routineWeeks?.[week] ?? []), routine]
              : (value.routineWeeks?.[week] ?? []).map((item) =>
                  item.id === id ? routine : item,
                ),
        },
      };
    });
    setEditor(null);
  };
  return (
    <>
      <div className="planner-toolbar weekly-toolbar">
        <div className="period-controls">
          <h1>Weekly checklist</h1>
          <div className="period-buttons">
            <button
              className="icon-button"
              aria-label="Previous week"
              onClick={() => setWeek(dateKey(addDays(parseDate(week), -7)))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Next week"
              onClick={() => setWeek(dateKey(addDays(parseDate(week), 7)))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="text-button" onClick={() => setWeek(currentWeek)}>
            This week
          </button>
        </div>
        <button
          className="primary-button"
          ref={addButton}
          onClick={() => setEditor('new')}
        >
          <Plus size={16} aria-hidden="true" /> Add routine
        </button>
      </div>
      <section className="weekly-sheet" aria-label="Weekly checklist">
        <p className="week-range">
          {format(week, { day: 'numeric', month: 'short', year: 'numeric' })} –{' '}
          {format(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        {!rows?.length ? (
          <div className="weekly-empty">
            <p>
              {week < currentWeek
                ? 'No checklist recorded for this week.'
                : 'Add the things you want to do consistently.'}
            </p>
            {!rows && (
              <button
                className="secondary-button"
                onClick={() =>
                  onChange((value) => startChecklistWeek(value, week))
                }
              >
                Use my routines
              </button>
            )}
          </div>
        ) : (
          <div className="weekly-routines">
            {rows.map((row) => {
              const count = routineProgress(state, row, week);
              const entries = routineEntries(state, row.id, week);
              return (
                <article
                  className="weekly-routine"
                  key={row.id}
                  aria-label={`Routine: ${row.title}`}
                >
                  <div className="weekly-routine-heading">
                    <div>
                      <h2>{row.title}</h2>
                      <p>
                        {row.daily
                          ? 'Daily · 7 per week'
                          : `${row.target} per week`}
                      </p>
                    </div>
                    <div className="weekly-row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit routine ${row.title}`}
                        onClick={() => setEditor(row)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove routine ${row.title}`}
                        onClick={() => setRemoving(row)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="weekly-routine-progress">
                    <div className="weekly-progress-label">
                      <strong>
                        {count} / {row.target}
                      </strong>
                      <span>
                        {count >= row.target
                          ? 'Target met'
                          : `${row.target - count} ${week < currentWeek ? 'short' : 'to go'}`}
                      </span>
                    </div>
                    <progress
                      max={row.target}
                      value={Math.min(count, row.target)}
                      aria-label={`${row.title} weekly progress`}
                    />
                    <button
                      className="secondary-button"
                      data-routine-log={row.id}
                      aria-label={`Log progress for ${row.title}`}
                      disabled={week > currentWeek}
                      onClick={() => setLogging(row)}
                    >
                      Log progress
                    </button>
                  </div>
                  {entries.length > 0 && (
                    <details className="weekly-entries">
                      <summary>Completed work ({entries.length})</summary>
                      {entries.map((task) => (
                        <div className="weekly-entry" key={task.id}>
                          <span>
                            {task.title}
                            <small>
                              {format(task.completedOn ?? task.date!, {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}{' '}
                              · {task.routineUnits ?? 1} completed
                            </small>
                          </span>
                          <button
                            className="text-button"
                            aria-label={`Reopen ${task.title}`}
                            onClick={() => reopen(task.id, row.id)}
                          >
                            Reopen
                          </button>
                        </div>
                      ))}
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      {logging && (
        <ProgressDialog
          routine={logging}
          week={week}
          today={today}
          entries={routineEntries(state, logging.id, week)}
          onClose={() => setLogging(null)}
          onSave={(day, units) => {
            onChange((value) => logRoutineProgress(value, logging, day, units));
            setLogging(null);
          }}
        />
      )}
      {editor && (
        <RoutineDialog
          routine={editor === 'new' ? undefined : editor}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
      {removing && (
        <Modal
          title="Remove routine"
          description={`Remove “${removing.title}” from this week${week >= currentWeek ? ' and stop repeating it' : ''}? Existing tasks and other weeks will be kept.`}
          onClose={() => setRemoving(null)}
        >
          <footer className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setRemoving(null)}
            >
              Keep routine
            </button>
            <button
              className="danger-button"
              onClick={() => {
                focusAfterRemove.current = true;
                onChange((value) => ({
                  ...value,
                  routines: (value.routines ?? []).map((item) =>
                    item.id === removing.id && week >= currentWeek
                      ? { ...item, archived: true }
                      : item,
                  ),
                  routineWeeks: {
                    ...value.routineWeeks,
                    [week]: (value.routineWeeks?.[week] ?? []).filter(
                      (item) => item.id !== removing.id,
                    ),
                  },
                }));
                setRemoving(null);
              }}
            >
              Remove routine
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}

function RoutineDialog({
  routine,
  onSave,
  onClose,
}: {
  routine?: WeeklyRoutine;
  onSave: (title: string, target: number, daily: boolean) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(routine?.title ?? '');
  const [daily, setDaily] = useState(routine?.daily ?? false);
  const [target, setTarget] = useState(String(routine?.target ?? 1));
  return (
    <Modal title={routine ? 'Edit routine' : 'Add routine'} onClose={onClose}>
      <form
        className="task-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (
            title.trim() &&
            (daily ||
              (Number.isInteger(Number(target)) &&
                Number(target) >= 1 &&
                Number(target) <= 1000))
          )
            onSave(title.trim(), daily ? 7 : Number(target), daily);
        }}
      >
        <label className="field">
          Name
          <input
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="routine-frequency">
          <input
            type="checkbox"
            checked={daily}
            onChange={(event) => setDaily(event.target.checked)}
          />
          Every day
        </label>
        {!daily && (
          <label className="field">
            Weekly target
            <input
              type="number"
              required
              min={1}
              max={1000}
              step={1}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </label>
        )}
        <p className="routine-hint">
          Weekly targets can be completed in batches. Choose Every day only for
          a daily routine. Saved weeks keep their own targets.
        </p>
        <footer className="modal-actions">
          <button className="primary-button" disabled={!title.trim()}>
            Save routine
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function ProgressDialog({
  routine,
  week,
  today,
  entries,
  onSave,
  onClose,
}: {
  routine: WeeklyRoutine;
  week: string;
  today: string;
  entries: import('./model').Task[];
  onSave: (day: string, units: number) => void;
  onClose: () => void;
}) {
  const last = dateKey(addDays(parseDate(week), 6));
  const max = last < today ? last : today;
  const [day, setDay] = useState(
    today > last ? last : today < week ? week : today,
  );
  const [units, setUnits] = useState('1');
  const duplicate =
    routine.daily &&
    entries.some((task) => (task.completedOn ?? task.date) === day);
  const valid =
    day >= week &&
    day <= max &&
    Number.isInteger(Number(units)) &&
    Number(units) >= 1 &&
    Number(units) <= 1000 &&
    !duplicate;
  return (
    <Modal title="Log progress" description={routine.title} onClose={onClose}>
      <form
        className="task-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onSave(day, routine.daily ? 1 : Number(units));
        }}
      >
        {!routine.daily && (
          <label className="field">
            How many completed?
            <input
              type="number"
              min={1}
              max={1000}
              step={1}
              required
              value={units}
              onChange={(event) => setUnits(event.target.value)}
            />
          </label>
        )}
        <label className="field">
          Completed on
          <input
            type="date"
            min={week}
            max={max}
            required
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
        {duplicate && (
          <p role="alert" className="focus-error">
            Already logged for this day.
          </p>
        )}
        <p className="routine-hint">
          Records completed work. Nothing is scheduled on the calendar.
        </p>
        <footer className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={!valid}>
            Log completed work
          </button>
        </footer>
      </form>
    </Modal>
  );
}
