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
  saveBlockWorkform,
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
  const [recording, setRecording] = useState<string | null>(null);
  const [workform, setWorkform] = useState('');
  const completedFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!completedFocus.current) return;
    Array.from(document.querySelectorAll<HTMLElement>('[data-plan-hour]'))
      .find((button) => button.dataset.planHour === completedFocus.current)
      ?.focus();
    completedFocus.current = null;
  }, [state.tasks]);
  const blocks = planForDay(state, day);
  const done = completedBlocks(state, day);
  const newIntention = useRef<HTMLTextAreaElement>(null);
  const focusNewHour = useRef(false);
  useEffect(() => {
    if (!focusNewHour.current) return;
    newIntention.current?.focus();
    focusNewHour.current = false;
  }, [blocks.length]);
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
                className={`focus-block ${complete ? 'block-complete' : ''} ${active ? 'block-active' : ''}`}
                key={block.id}
                aria-label={`Hour ${index + 1}`}
                tabIndex={-1}
                data-plan-hour={block.id}
              >
                <div className="block-fields">
                  <div className="block-description">
                    <div className="block-caption">
                      <span>Hour {index + 1}</span>
                      {active && <span>In progress</span>}
                    </div>
                    {complete ? (
                      <div className="completed-hour-copy">
                        <h3>
                          {block.intent?.trim() ||
                            task?.title ||
                            'Focused hour'}
                        </h3>
                      </div>
                    ) : (
                      <>
                        <textarea
                          ref={
                            index === blocks.length - 1
                              ? newIntention
                              : undefined
                          }
                          aria-label={`Intention for hour ${index + 1}`}
                          placeholder="What will you work on this hour?"
                          maxLength={1000}
                          rows={1}
                          value={block.intent ?? task?.title ?? ''}
                          disabled={locked}
                          onChange={(event) =>
                            change(block.id, { intent: event.target.value })
                          }
                        />
                      </>
                    )}
                  </div>
                  <div className="block-actions">
                    {!complete && (
                      <button
                        className={`block-start ${!complete && !state.focus && block.id === nextBlock?.id ? 'primary-button' : 'secondary-button'}`}
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
                        aria-label={`${complete ? 'Completed' : active ? 'Resume' : 'Start'} hour ${index + 1}`}
                        title={
                          day !== today && !complete
                            ? 'Start blocks from today’s plan'
                            : complete
                              ? 'Hour completed'
                              : active
                                ? 'Resume focus'
                                : task || block.intent?.trim()
                                  ? 'Start a focused hour'
                                  : 'Write an intention to start this hour'
                        }
                      >
                        <Play size={14} aria-hidden="true" />
                        <span>{active ? 'Resume' : 'Start hour'}</span>
                      </button>
                    )}
                    {complete ? (
                      <span className="hour-done">
                        <Check size={15} aria-hidden="true" />
                        Completed
                      </span>
                    ) : (
                      <button
                        className="text-button block-done"
                        aria-label={`Mark done: hour ${index + 1}`}
                        disabled={!!state.focus || day > today}
                        title={
                          state.focus
                            ? 'Finish or stop your active session first'
                            : 'Record an hour you have completed'
                        }
                        onClick={() => {
                          if (records[0]?.progress.trim()) {
                            completedFocus.current = block.id;
                            onChange((current) => {
                              if (current.focus) return current;
                              const record = blockRecords(
                                current,
                                day,
                                block.id,
                              )[0];
                              const owner = current.tasks.find((task) =>
                                task.sessions?.some(
                                  (item) => item.id === record?.id,
                                ),
                              );
                              if (!record?.progress.trim() || !owner)
                                return current;
                              return saveBlockWorkform(current, owner.id, {
                                ...record,
                                minutes: 60,
                                endedAt: Math.max(record.endedAt, Date.now()),
                              });
                            });
                          } else {
                            setWorkform('');
                            setRecording(block.id);
                          }
                        }}
                      >
                        Mark done
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {blocks.length < 24 && (
          <button
            className="add-focus-block"
            onClick={() => {
              focusNewHour.current = true;
              onChange((current) => ({
                ...current,
                dailyPlans: {
                  ...current.dailyPlans,
                  [day]: [...planForDay(current, day), extraBlock()],
                },
              }));
            }}
          >
            <Plus size={16} aria-hidden="true" /> Add another hour
          </button>
        )}
      </section>
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
                return saveBlockWorkform(
                  {
                    ...current,
                    tasks: current.tasks.some((item) => item.id === task.id)
                      ? current.tasks
                      : [...current.tasks, task],
                    dailyPlans: {
                      ...current.dailyPlans,
                      [day]: list.map((item) =>
                        item.id === block.id
                          ? { ...item, taskId: task.id }
                          : item,
                      ),
                    },
                  },
                  task.id,
                  record,
                );
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
                maxLength={1000000}
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
