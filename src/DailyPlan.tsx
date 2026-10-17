import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, ChevronLeft, ChevronRight, Play, Plus } from 'lucide-react';
import {
  addDays,
  blockRecords,
  completedBlocks,
  createTask,
  dateKey,
  parseDate,
  planForDay,
  type FocusBlock,
  type PlannerState,
} from './model';

function extraBlock(taskId: string | null = null): FocusBlock {
  return { id: crypto.randomUUID(), taskId };
}

export function DailyPlan({
  state,
  onChange,
  today,
  onStart,
  onResume,
}: {
  state: PlannerState;
  onChange: Dispatch<SetStateAction<PlannerState>>;
  today: string;
  onStart: (day: string, block: FocusBlock) => void;
  onResume: () => void;
}) {
  const [day, setDay] = useState(today);
  const [capture, setCapture] = useState('');
  const blocks = planForDay(state, day);
  const done = completedBlocks(state, day);
  const canCapture =
    blocks.length < 24 ||
    blocks.some(
      (block) =>
        !block.intent?.trim() &&
        (!block.taskId ||
          !state.tasks.some((task) => task.id === block.taskId)),
    );
  const newTask = useRef<HTMLSelectElement>(null);
  const nextBlock = blocks.find(
    (block) =>
      (block.taskId || block.intent?.trim()) &&
      !blockRecords(state, day, block.id).some(
        (record) => record.minutes >= 60 && record.progress.trim(),
      ),
  );
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
  return (
    <>
      <div className="planner-toolbar daily-toolbar">
        <div className="period-controls">
          <h1>Plan</h1>
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
          <div
            className="daily-score"
            role="status"
            aria-label={`${done} of 4 deep-work hours completed`}
          >
            <strong>
              {done}
              <span> / 4 hours</span>
            </strong>
            <small>
              {done >= 4
                ? 'Daily goal reached'
                : `${4 - done} ${4 - done === 1 ? 'hour' : 'hours'} to go`}
            </small>
          </div>
        </header>
        <div
          className="daily-goal"
          role="progressbar"
          aria-label="Daily deep-work goal"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={Math.min(done, 4)}
          aria-valuetext={`${done} of 4 hours`}
        >
          {[1, 2, 3, 4].map((hour) => (
            <span
              key={hour}
              className={done >= hour ? 'goal-hour is-earned' : 'goal-hour'}
              aria-hidden="true"
            >
              {done >= hour && <Check size={15} />} {hour}h
            </span>
          ))}
        </div>
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
                  <div className="block-description">
                    <textarea
                      aria-label={`Intention for block ${index + 1}`}
                      placeholder="What will you work on this hour?"
                      maxLength={1000}
                      rows={2}
                      value={block.intent ?? ''}
                      disabled={locked}
                      onChange={(event) =>
                        change(block.id, { intent: event.target.value })
                      }
                    />
                    <label className="block-task">
                      <span className="visually-hidden">Task</span>
                      <select
                        ref={index === blocks.length - 1 ? newTask : undefined}
                        aria-label={`Task for block ${index + 1}`}
                        value={task?.id ?? ''}
                        disabled={locked}
                        onChange={(event) =>
                          change(block.id, {
                            taskId: event.target.value || null,
                          })
                        }
                      >
                        <option value="">Link a task (optional)</option>
                        {state.tasks
                          .filter(
                            (item) =>
                              !item.completed || item.id === block.taskId,
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title}
                              {item.completed ? ' (completed)' : ''}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <button
                    className={`block-start ${!complete && !state.focus && block.id === nextBlock?.id ? 'primary-button' : 'icon-button'}`}
                    disabled={
                      complete ||
                      (!active &&
                        (!!state.focus ||
                          (!task && !block.intent?.trim()) ||
                          day !== today))
                    }
                    onClick={() => (active ? onResume() : onStart(day, block))}
                    aria-label={`${complete ? 'Completed' : active ? 'Resume' : 'Start'} block ${index + 1}`}
                    title={
                      day !== today && !complete
                        ? 'Start blocks from today’s plan'
                        : complete
                          ? 'Hour completed'
                          : active
                            ? 'Resume focus'
                            : task || block.intent?.trim()
                              ? 'Start a focused hour'
                              : 'Describe your hour or choose a task'
                    }
                  >
                    {complete ? (
                      <Check size={18} aria-hidden="true" />
                    ) : active ? (
                      <Play size={16} aria-hidden="true" />
                    ) : (
                      <>
                        <Play size={14} aria-hidden="true" />
                        {block.id === nextBlock?.id && !state.focus && (
                          <span>Start hour</span>
                        )}
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
        <form
          className="plan-capture"
          onSubmit={(event) => {
            event.preventDefault();
            if (!capture.trim() || !canCapture) return;
            const task = createTask(capture, null);
            onChange((current) => {
              const list = planForDay(current, day);
              const empty = list.find(
                (block) =>
                  !block.intent?.trim() &&
                  (!block.taskId ||
                    !current.tasks.some((item) => item.id === block.taskId)),
              );
              if (!empty && list.length >= 24) return current;
              return {
                ...current,
                tasks: [...current.tasks, task],
                dailyPlans: {
                  ...current.dailyPlans,
                  [day]: empty
                    ? list.map((block) =>
                        block.id === empty.id
                          ? { ...block, taskId: task.id }
                          : block,
                      )
                    : [...list, extraBlock(task.id)],
                },
              };
            });
            setCapture('');
          }}
        >
          <Plus size={16} aria-hidden="true" />
          <input
            aria-label="New task for today’s plan"
            placeholder={
              canCapture
                ? 'Add a task for your next hour'
                : 'All 24 hours are planned'
            }
            disabled={!canCapture}
            value={capture}
            maxLength={300}
            onChange={(event) => setCapture(event.target.value)}
          />
          {capture.trim() && (
            <button className="small-primary">Add task</button>
          )}
        </form>
        {blocks.length < 24 && (
          <button
            className="add-focus-block"
            onClick={() => {
              onChange((current) => ({
                ...current,
                dailyPlans: {
                  ...current.dailyPlans,
                  [day]: [...planForDay(current, day), extraBlock()],
                },
              }));
              requestAnimationFrame(() => newTask.current?.focus());
            }}
          >
            <Plus size={16} aria-hidden="true" /> Add another hour
          </button>
        )}
      </section>
    </>
  );
}
