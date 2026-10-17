import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Checklist, NameDialog } from './Checklist';
import { useToday } from './useToday';
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
  const today = useToday();
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
              className={`month-day ${key < today ? 'past-day' : ''} ${day.getMonth() !== month.getMonth() ? 'outside-month' : ''} ${key === today ? 'month-today' : ''} ${key === selected ? 'month-selected' : ''}`}
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
  const today = useToday();
  return (
    <div className="year-view" aria-label={`${year} year overview`}>
      {Array.from({ length: 12 }, (_, index) => {
        const month = monthStart(new Date());
        month.setFullYear(year, index, 1);
        const key = dateKey(month).slice(0, 7);
        const calendarDays = monthDays(month);
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
              {Array.from({ length: 42 }, (_, i) => {
                const day = calendarDays[i];
                if (!day) return <span key={`empty-${i}`} />;
                const date = dateKey(day);
                if (day.getMonth() !== index) return <span key={date} />;
                const items = scheduled.filter((task) => task.date === date);
                const pending = items.some((task) => !task.completed);
                return (
                  <button
                    key={date}
                    className={`${date < today ? 'past-day' : ''} ${date === today ? 'mini-today' : ''} ${pending ? 'has-actions' : items.length ? 'actions-done' : ''}`}
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

export function GoalsView({
  year,
  creating,
  onCreationClose,
  goals,
  tasks,
  renderActions,
  onAddGoal,
  onRename,
  onDelete,
  onAddAction,
}: {
  year: number;
  creating: boolean;
  onCreationClose: () => void;
  goals: Goal[];
  tasks: Task[];
  renderActions: (tasks: Task[]) => ReactNode;
  onAddGoal: (title: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onAddAction: (title: string, goalId: string) => void;
}) {
  const [editor, setEditor] = useState<Goal | null>(null);
  const [removing, setRemoving] = useState<Goal | null>(null);
  const visible = goals.filter((goal) => goal.year === year);
  const root = useRef<HTMLDivElement>(null);
  const focusNewGoal = useRef(false);
  useEffect(() => {
    if (!focusNewGoal.current) return;
    root.current
      ?.querySelector<HTMLInputElement>(
        '.goal-column:last-child .goal-action-composer input',
      )
      ?.focus();
    focusNewGoal.current = false;
  }, [visible.length]);
  return (
    <div className="goals-view" ref={root}>
      <div className="goals-grid">
        {visible.map((goal) => (
          <Checklist
            kind="goal"
            key={goal.id}
            id={goal.id}
            title={goal.title}
            tasks={tasks.filter((task) => task.goalId === goal.id)}
            renderTasks={renderActions}
            onAdd={onAddAction}
            onEdit={() => setEditor(goal)}
            onRemove={() => setRemoving(goal)}
          />
        ))}
      </div>
      {(editor || creating) && (
        <NameDialog
          kind="goal"
          title={editor?.title}
          onClose={() => {
            setEditor(null);
            onCreationClose();
          }}
          onSave={(title) => {
            if (editor) onRename(editor.id, title);
            else {
              focusNewGoal.current = true;
              onAddGoal(title);
            }
            setEditor(null);
            onCreationClose();
          }}
        />
      )}
      {removing && (
        <Modal
          title="Remove goal"
          description={`Remove “${removing.title}”? Its tasks and scheduled dates will be kept in your planner.`}
          onClose={() => setRemoving(null)}
        >
          <footer className="modal-actions">
            <button
              className="secondary-button"
              autoFocus
              onClick={() => setRemoving(null)}
            >
              Keep goal
            </button>
            <button
              className="danger-button"
              onClick={() => {
                onDelete(removing.id);
                setRemoving(null);
              }}
            >
              Remove goal
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
