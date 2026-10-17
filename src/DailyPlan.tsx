import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Modal } from './Modal';
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
  const [recording, setRecording] = useState<string | null>(null);
  const [workform, setWorkform] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);
  const completedFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!completedFocus.current) return;
    Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-workform-block]'),
    )
      .find((button) => button.dataset.workformBlock === completedFocus.current)
      ?.focus();
    completedFocus.current = null;
  }, [state.tasks]);
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
                  <div className="block-actions">
                    <button
                      className={`block-start ${!complete && !state.focus && block.id === nextBlock?.id ? 'primary-button' : 'icon-button'}`}
                      disabled={
                        complete ||
                        (!active &&
                          (!!state.focus ||
                            (!task && !block.intent?.trim()) ||
                            day !== today))
                      }
                      onClick={() =>
                        active ? onResume() : onStart(day, block)
                      }
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
                    {complete ? (
                      <span className="hour-done">Done</span>
                    ) : (
                      <button
                        className="text-button block-done"
                        aria-label={`Mark block ${index + 1} done`}
                        disabled={!!state.focus || day > today}
                        title={
                          state.focus
                            ? 'Finish or stop your active session first'
                            : 'Record an hour you have completed'
                        }
                        onClick={() => {
                          setWorkform('');
                          setRecording(block.id);
                        }}
                      >
                        Mark done
                      </button>
                    )}
                  </div>
                </div>
                {records.length > 0 && (
                  <div className="block-workforms">
                    <button
                      className="text-button"
                      data-workform-block={block.id}
                      aria-label={`View workform for block ${index + 1}`}
                      onClick={() => setViewing(block.id)}
                    >
                      View workform
                      {records.length > 1 ? `s (${records.length})` : ''}
                    </button>
                  </div>
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
      {viewing && (
        <Modal
          title="Hour workform"
          onClose={() => setViewing(null)}
          initialFocus="button"
        >
          <div className="saved-workforms">
            {blockRecords(state, day, viewing).map((record) => (
              <section key={record.id}>
                <p className="routine-hint">
                  {record.minutes >= 60
                    ? '1 focused hour'
                    : `${Math.floor(record.minutes)} minutes · partial session`}
                </p>
                {record.intent && (
                  <p className="routine-hint">Planned: {record.intent}</p>
                )}
                <h3>What you worked on</h3>
                <p className="saved-reflection">{record.progress}</p>
              </section>
            ))}
          </div>
          <footer className="modal-actions">
            <button className="primary-button" onClick={() => setViewing(null)}>
              Close workform
            </button>
          </footer>
        </Modal>
      )}
      {recording && (
        <Modal
          title="Complete hour"
          description="Record a focused hour you have already worked."
          onClose={() => setRecording(null)}
        >
          <form
            className="task-editor"
            onSubmit={(event) => {
              event.preventDefault();
              if (!workform.trim()) return;
              onChange((current) => {
                const list = planForDay(current, day);
                const block = list.find((item) => item.id === recording);
                if (
                  !block ||
                  current.focus ||
                  blockRecords(current, day, block.id).some(
                    (record) => record.minutes >= 60 && record.progress.trim(),
                  )
                )
                  return current;
                const task =
                  current.tasks.find((item) => item.id === block.taskId) ??
                  createTask(
                    (block.intent?.trim() || workform.trim()).slice(0, 300),
                    null,
                  );
                const endedAt = Date.now();
                const record = {
                  id: crypto.randomUUID(),
                  startedAt: endedAt - 3600000,
                  endedAt,
                  minutes: 60,
                  progress: workform.trim(),
                  blockId: block.id,
                  planDate: day,
                  ...(block.intent ? { intent: block.intent } : {}),
                };
                const updated = {
                  ...task,
                  sessions: [...(task.sessions ?? []), record],
                };
                return {
                  ...current,
                  tasks: current.tasks.some((item) => item.id === task.id)
                    ? current.tasks.map((item) =>
                        item.id === task.id ? updated : item,
                      )
                    : [...current.tasks, updated],
                  dailyPlans: {
                    ...current.dailyPlans,
                    [day]: list.map((item) =>
                      item.id === block.id
                        ? { ...item, taskId: task.id }
                        : item,
                    ),
                  },
                };
              });
              completedFocus.current = recording;
              setRecording(null);
            }}
          >
            <label className="field">
              What did you work on?
              <textarea
                required
                rows={5}
                maxLength={2000}
                value={workform}
                onChange={(event) => setWorkform(event.target.value)}
              />
            </label>
            <footer className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setRecording(null)}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={!workform.trim()}>
                <Check size={16} aria-hidden="true" /> Complete hour
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
