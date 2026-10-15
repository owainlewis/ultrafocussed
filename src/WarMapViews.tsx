import { useEffect, useState, type ReactNode } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { dateKey, monthDays, monthStart, type Goal, type Task } from './model';

const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long' });
const fullDate = {
  format: (day: Date) =>
    `${new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(day)} ${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(day)}`,
};
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

function useNarrow() {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 760px)').matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 760px)');
    const change = () => setNarrow(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return narrow;
}

export function MonthView({
  month,
  tasks,
  selected,
  onSelect,
  renderDay,
  dropProps,
}: {
  month: Date;
  tasks: Task[];
  selected: string;
  onSelect: (date: string) => void;
  renderDay: (day: Date) => ReactNode;
  dropProps: (date: string) => object;
}) {
  const days = monthDays(month);
  const narrow = useNarrow();
  const today = dateKey(new Date());
  return (
    <div className="month-view">
      <div className="month-weekdays" aria-hidden="true">
        {days.slice(0, 7).map((day) => (
          <span key={dateKey(day)}>{weekday.format(day)}</span>
        ))}
      </div>
      <div className="month-grid">
        {days.map((day) => {
          const key = dateKey(day);
          const count = tasks.filter(
            (task) => task.date === key && !task.completed,
          ).length;
          return (
            <section
              key={key}
              className={`month-day ${day.getMonth() !== month.getMonth() ? 'outside-month' : ''} ${key === today ? 'month-today' : ''} ${key === selected ? 'month-selected' : ''}`}
              aria-label={fullDate.format(day)}
              {...dropProps(key)}
            >
              <button
                className="month-date"
                aria-label={`Select ${fullDate.format(day)}`}
                aria-pressed={key === selected}
                onClick={() => onSelect(key)}
              >
                <span>{day.getDate()}</span>
                {key === today && !narrow && <small>Today</small>}
                {narrow && count > 0 && (
                  <span className="month-count">{count}</span>
                )}
              </button>
              {!narrow && renderDay(day)}
            </section>
          );
        })}
      </div>
      {narrow && (
        <section
          className="selected-date-tasks"
          aria-label={`Tasks for ${fullDate.format(new Date(`${selected}T12:00:00`))}`}
          {...dropProps(selected)}
        >
          <h2>{fullDate.format(new Date(`${selected}T12:00:00`))}</h2>
          {renderDay(new Date(`${selected}T12:00:00`))}
        </section>
      )}
    </div>
  );
}

export function YearView({
  year,
  tasks,
  onMonth,
  onDay,
}: {
  year: number;
  tasks: Task[];
  onMonth: (month: Date) => void;
  onDay: (date: string) => void;
}) {
  const today = dateKey(new Date());
  return (
    <div className="year-view" aria-label={`${year} year overview`}>
      {Array.from({ length: 12 }, (_, index) => {
        const month = monthStart(new Date());
        month.setFullYear(year, index, 1);
        const key = dateKey(month).slice(0, 7);
        const scheduled = tasks.filter((task) => task.date?.startsWith(key));
        return (
          <section
            className={`year-month ${today.startsWith(key) ? 'year-current' : ''}`}
            key={key}
          >
            <header>
              <button
                aria-label={`Open ${monthLabel.format(month)} ${year}`}
                onClick={() => onMonth(monthStart(month))}
              >
                {monthLabel.format(month)}
              </button>
            </header>
            <div className="mini-weekdays" aria-hidden="true">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>
            <div className="mini-days">
              {monthDays(month).map((day) => {
                const date = dateKey(day);
                if (day.getMonth() !== index) return <span key={date} />;
                const items = scheduled.filter((task) => task.date === date);
                const pending = items.some((task) => !task.completed);
                return (
                  <button
                    key={date}
                    className={`${date === today ? 'mini-today' : ''} ${pending ? 'has-actions' : items.length ? 'actions-done' : ''}`}
                    aria-label={`${fullDate.format(day)}, ${items.length} action${items.length === 1 ? '' : 's'}`}
                    onClick={() => onDay(date)}
                  >
                    {day.getDate()}
                    {items.length > 0 && (
                      <span className="mini-dot" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ActionComposer({
  goal,
  onAdd,
}: {
  goal: Goal;
  onAdd: (title: string, goalId: string) => void;
}) {
  const [title, setTitle] = useState('');
  return (
    <form
      className="goal-action-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title.trim(), goal.id);
        setTitle('');
      }}
    >
      <Plus size={15} aria-hidden="true" />
      <input
        aria-label={`New action for ${goal.title}`}
        placeholder="Add an action"
        maxLength={300}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button className="small-primary" disabled={!title.trim()}>
        Add
      </button>
    </form>
  );
}

function GoalColumn({
  goal,
  tasks,
  renderActions,
  onAdd,
  onRename,
  onDelete,
}: {
  goal: Goal;
  tasks: Task[];
  renderActions: (tasks: Task[]) => ReactNode;
  onAdd: (title: string, goalId: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  useEffect(() => setTitle(goal.title), [goal.title]);
  return (
    <section className="goal-column" aria-label={`Goal: ${goal.title}`}>
      <header>
        <div>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim()) return;
                onRename(goal.id, title.trim());
                setEditing(false);
              }}
            >
              <input
                aria-label="Goal name"
                autoFocus
                maxLength={200}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button className="small-primary" disabled={!title.trim()}>
                Save goal
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setTitle(goal.title);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <h2>{goal.title}</h2>
          )}
        </div>
        <div className="goal-controls">
          <button
            className="icon-button"
            aria-label={`Edit goal ${goal.title}`}
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Remove goal ${goal.title}`}
            onClick={() => onDelete(goal.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>
      {renderActions(tasks)}
      <ActionComposer goal={goal} onAdd={onAdd} />
    </section>
  );
}

export function GoalsView({
  year,
  goals,
  tasks,
  renderActions,
  onAddGoal,
  onRename,
  onDelete,
  onAddAction,
}: {
  year: number;
  goals: Goal[];
  tasks: Task[];
  renderActions: (tasks: Task[]) => ReactNode;
  onAddGoal: (title: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onAddAction: (title: string, goalId: string) => void;
}) {
  const [title, setTitle] = useState('');
  const visible = goals.filter((goal) => goal.year === year);
  return (
    <div className="goals-view">
      <div className="goals-grid">
        {visible.map((goal) => (
          <GoalColumn
            key={goal.id}
            goal={goal}
            tasks={tasks.filter((task) => task.goalId === goal.id)}
            renderActions={renderActions}
            onAdd={onAddAction}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
      {visible.length < 4 && (
        <form
          className="new-goal"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            onAddGoal(title.trim());
            setTitle('');
          }}
        >
          <label htmlFor="new-goal">Add a goal</label>
          <input
            id="new-goal"
            placeholder="Goal title"
            value={title}
            maxLength={200}
            required
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className="primary-button" disabled={!title.trim()}>
            <Plus size={15} /> Add goal
          </button>
        </form>
      )}
    </div>
  );
}
