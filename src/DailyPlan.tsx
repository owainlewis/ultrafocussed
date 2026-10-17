import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, ChevronLeft, ChevronRight, Play, Plus } from 'lucide-react';
import {
  addDays,
  blockRecords,
  completedBlocks,
  dateKey,
  parseDate,
  planForDay,
  type FocusBlock,
  type PlannerState,
} from './model';

export function DailyPlan({
  state,
  onChange,
  today,
  onStart,
  onResume,
  onTasks,
}: {
  state: PlannerState;
  onChange: Dispatch<SetStateAction<PlannerState>>;
  today: string;
  onStart: (day: string, block: FocusBlock) => void;
  onResume: () => void;
  onTasks: () => void;
}) {
  const [day, setDay] = useState(today);
  const blocks = planForDay(state, day);
  const done = completedBlocks(state, day);
  const newTime = useRef<HTMLInputElement>(null);
  const change = (id: string, patch: Partial<FocusBlock>) =>
    onChange((current) => ({
      ...current,
      dailyPlans: {
        ...current.dailyPlans,
        [day]: planForDay(current, day).map((block) =>
          block.id === id ? { ...block, ...patch } : block,
        ),
      },
    }));
  const timeEnd = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const overlap = blocks.some((block, i) =>
    blocks.some(
      (other, j) =>
        i < j &&
        block.time < timeEnd(other.time) &&
        other.time < timeEnd(block.time),
    ),
  );
  return (
    <>
      <div className="planner-toolbar daily-toolbar">
        <div className="period-controls">
          <h1>Daily plan</h1>
          <div className="period-buttons">
            <button
              className="icon-button"
              aria-label="Previous day"
              onClick={() => setDay(dateKey(addDays(parseDate(day), -1)))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Next day"
              onClick={() => setDay(dateKey(addDays(parseDate(day), 1)))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="text-button" onClick={() => setDay(today)}>
            Today
          </button>
        </div>
        {state.focus && (
          <button className="primary-button" onClick={onResume}>
            Resume focus
          </button>
        )}
      </div>
      <section className="daily-plan" aria-label="Daily focus blocks">
        <header className="daily-heading">
          <h2>
            {new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(parseDate(day))}
          </h2>
          <p role="status">
            <strong>{done}</strong> / {blocks.length} blocks completed
          </p>
        </header>
        {overlap && (
          <p className="plan-note">
            Some planned times overlap. Adjust them to leave an hour for each
            block.
          </p>
        )}
        {!state.tasks.length && (
          <p className="plan-note">
            Capture your work in{' '}
            <button className="inline-link" onClick={onTasks}>
              Tasks
            </button>
            , then assign it here.
          </p>
        )}
        <div className="focus-blocks">
          {blocks.map((block, index) => {
            const records = blockRecords(state, day, block.id);
            const complete = records.some(
              (record) => record.minutes >= 60 && record.progress.trim(),
            );
            const active =
              state.focus?.blockId === block.id && state.focus.planDate === day;
            const task = state.tasks.find((item) => item.id === block.taskId);
            const locked = complete || active;
            return (
              <article
                className={`focus-block ${complete ? 'block-complete' : ''}`}
                key={block.id}
                aria-label={`Block ${index + 1}`}
              >
                <div className="block-fields">
                  <div className="block-number">
                    {complete ? (
                      <Check size={18} aria-hidden="true" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                    <span className="visually-hidden">
                      {complete ? 'Completed' : `Block ${index + 1}`}
                    </span>
                  </div>
                  <label className="block-time">
                    <span>Start time</span>
                    <input
                      ref={index === blocks.length - 1 ? newTime : undefined}
                      type="time"
                      min="00:00"
                      max="23:00"
                      required
                      value={block.time}
                      disabled={locked}
                      aria-label={`Start time for block ${index + 1}`}
                      onChange={(event) => {
                        if (
                          /^([01]\d|2[0-3]):[0-5]\d$/.test(
                            event.target.value,
                          ) &&
                          event.target.value <= '23:00'
                        )
                          change(block.id, { time: event.target.value });
                      }}
                    />
                    <small>to {timeEnd(block.time)}</small>
                  </label>
                  <label className="block-task">
                    <span>Task</span>
                    <select
                      aria-label={`Task for block ${index + 1}`}
                      value={task?.id ?? ''}
                      disabled={locked}
                      onChange={(event) =>
                        change(block.id, { taskId: event.target.value || null })
                      }
                    >
                      <option value="">Choose a task</option>
                      {state.tasks
                        .filter(
                          (item) => !item.completed || item.id === block.taskId,
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                            {item.completed ? ' (completed)' : ''}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    className={complete ? 'secondary-button' : 'primary-button'}
                    disabled={
                      complete ||
                      (!active && (!!state.focus || !task || day !== today))
                    }
                    onClick={() => (active ? onResume() : onStart(day, block))}
                    aria-label={`${active ? 'Resume' : 'Start'} block ${index + 1}`}
                    title={
                      day !== today && !complete
                        ? 'Start blocks from today’s plan'
                        : undefined
                    }
                  >
                    {complete ? (
                      'Completed'
                    ) : active ? (
                      'Resume'
                    ) : (
                      <>
                        <Play size={14} aria-hidden="true" /> Start hour
                      </>
                    )}
                  </button>
                </div>
                {records.length > 0 && (
                  <details className="block-workforms">
                    <summary>Workforms ({records.length})</summary>
                    {records.map((record) => (
                      <div key={record.id}>
                        <small>
                          {record.minutes >= 60
                            ? '1 hour'
                            : `${Math.floor(record.minutes)} min · partial session`}
                        </small>
                        <p>{record.progress}</p>
                      </div>
                    ))}
                  </details>
                )}
              </article>
            );
          })}
        </div>
        {blocks.length < 24 && (
          <button
            className="add-focus-block"
            onClick={() => {
              onChange((current) => ({
                ...current,
                dailyPlans: {
                  ...current.dailyPlans,
                  [day]: [
                    ...planForDay(current, day),
                    { id: crypto.randomUUID(), time: '16:00', taskId: null },
                  ],
                },
              }));
              requestAnimationFrame(() => newTime.current?.focus());
            }}
          >
            <Plus size={16} aria-hidden="true" /> Add another hour
          </button>
        )}
      </section>
    </>
  );
}
