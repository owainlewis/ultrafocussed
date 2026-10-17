import { useEffect, useRef, useState } from 'react';
import {
  remainingSeconds,
  formatClock as clock,
  type Task,
  type PlannerState,
} from './model';

type FocusMode = 'setup' | 'running' | 'review';
export function FocusPanel({
  task,
  session,
  onStart,
  onStop,
  onFinish,
  onWorkform,
}: {
  task: Task;
  session: PlannerState['focus'];
  onStart: (duration: number) => void;
  onStop: () => void;
  onFinish: (progress?: string) => void;
  onWorkform: (text: string) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [minutes, setMinutes] = useState('60');
  const workform = session?.workform ?? '';
  const panel = useRef<HTMLElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const previous = useRef<FocusMode | null>(null);
  const seconds = session ? remainingSeconds(session, now) : 0;
  const mode: FocusMode = !session
    ? 'setup'
    : session.stoppedAt !== undefined || seconds === 0
      ? 'review'
      : 'running';
  const duration = Number(minutes);
  const valid = Number.isInteger(duration) && duration >= 1 && duration <= 180;
  useEffect(() => {
    if (mode !== 'running') return;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [mode]);
  useEffect(() => {
    const before = previous.current;
    previous.current = mode;
    if (mode === 'setup') minutesRef.current?.focus();
    else if (mode === 'running' && before === 'setup') panel.current?.focus();
    else if (mode === 'review')
      (session?.blockId
        ? panel.current?.querySelector<HTMLTextAreaElement>('textarea')
        : finishRef.current
      )?.focus();
  }, [mode]);
  return (
    <section
      ref={panel}
      tabIndex={-1}
      className={`focus-panel focus-state-${mode}`}
      aria-label="Focus session"
    >
      <h3 className="focus-task">{session?.intent?.trim() || task.title}</h3>
      {mode === 'setup' ? (
        <form
          className="focus-start"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) onStart(duration);
          }}
        >
          <label className="field">
            Minutes
            <input
              ref={minutesRef}
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              step={1}
              required
              aria-invalid={!valid}
              aria-describedby="focus-minutes-hint"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
          <small
            id="focus-minutes-hint"
            className={valid ? 'visually-hidden' : 'focus-error'}
          >
            Choose 1 to 180 minutes.
          </small>
          <button className="primary-button" disabled={!valid}>
            Begin session
          </button>
        </form>
      ) : mode === 'running' ? (
        <div className="focus-running-controls">
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
      ) : (
        <form
          className="focus-review"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.blockId || workform.trim()) onFinish(workform);
          }}
        >
          <p>
            {session?.blockId
              ? 'Save your workform to finish this session.'
              : 'Session ended.'}
          </p>
          {session?.blockId && (
            <label className="field">
              What did you work on?
              <textarea
                value={workform}
                onChange={(event) => onWorkform(event.target.value)}
                required
                maxLength={1000000}
                rows={4}
              />
            </label>
          )}
          {session?.blockId && seconds > 0 && (
            <p className="routine-hint">
              Stopped early. Your time and notes will be saved to this hour.
              Continue later or use Mark done when the hour is complete.
            </p>
          )}
          <button
            ref={finishRef}
            className="primary-button"
            disabled={!!session?.blockId && !workform.trim()}
          >
            {session?.blockId ? 'Submit workform' : 'Finish session'}
          </button>
        </form>
      )}
    </section>
  );
}
