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
  toggleRoutineDay,
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
  useEffect(() => {
    if (focusAfterRemove.current) {
      addButton.current?.focus();
      focusAfterRemove.current = false;
    }
  }, [rows]);
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
          <div
            className="weekly-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Routine days, Monday to Sunday"
          >
            <table className="weekly-table">
              <thead>
                <tr>
                  <th scope="col">Routine</th>
                  {days.map((day) => (
                    <th
                      scope="col"
                      key={day}
                      aria-current={day === today ? 'date' : undefined}
                    >
                      <span>{format(day, { weekday: 'short' })}</span>
                      <small>{format(day, { day: 'numeric' })}</small>
                    </th>
                  ))}
                  <th scope="col">Week</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const completed = days.filter((day) =>
                    state.tasks.some(
                      (task) =>
                        task.routineId === row.id &&
                        task.date === day &&
                        task.completed,
                    ),
                  );
                  const missed = row.daily
                    ? days.filter(
                        (day) => day < today && !completed.includes(day),
                      ).length
                    : 0;
                  const shortfall = Math.max(0, row.target - completed.length);
                  return (
                    <tr key={row.id}>
                      <th scope="row">
                        <span>{row.title}</span>
                        <small>
                          {row.daily ? 'Daily' : `${row.target} per week`}
                        </small>
                      </th>
                      {days.map((day) => {
                        const checked = completed.includes(day);
                        return (
                          <td
                            key={day}
                            className={`${day < today ? 'elapsed-day' : ''} ${row.daily && day < today && !checked ? 'missed-day' : ''}`}
                          >
                            <label className="weekly-check">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={day > today}
                                aria-label={`${row.title}, ${format(day, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}`}
                                onChange={() =>
                                  onChange((value) =>
                                    toggleRoutineDay(value, row, day),
                                  )
                                }
                              />
                            </label>
                          </td>
                        );
                      })}
                      <td className="weekly-total">
                        <strong>
                          {completed.length} / {row.target}
                        </strong>
                        <small>
                          {shortfall === 0
                            ? 'Target met'
                            : row.daily && missed
                              ? `${missed} missed`
                              : week < currentWeek
                                ? `${shortfall} short`
                                : `${shortfall} to go`}
                        </small>
                      </td>
                      <td>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
                Number(target) <= 7))
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
              max={7}
              step={1}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </label>
        )}
        <p className="routine-hint">
          One check per day. Changes in the current week apply to new checklists
          too. Saved weeks keep their own targets.
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
