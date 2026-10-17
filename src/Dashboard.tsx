import { useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from './Modal';
import {
  addDays,
  completedBlocks,
  dateKey,
  parseDate,
  weekStart,
  type FocusRecord,
  type PlannerState,
} from './model';

export function weeklyScore(state: PlannerState, week: string) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = dateKey(addDays(parseDate(week), index));
    return { day, hours: completedBlocks(state, day) };
  });
  const end = days[6].day;
  const seen = new Set<string>();
  const workforms = state.tasks
    .flatMap((task) =>
      (task.sessions ?? []).flatMap((record) => {
        if (
          !record.planDate ||
          !record.blockId ||
          record.planDate < week ||
          record.planDate > end ||
          record.minutes < 60 ||
          !record.progress.trim() ||
          !(state.dailyPlans?.[record.planDate] ?? []).some(
            (block) => block.id === record.blockId,
          )
        )
          return [];
        const key = JSON.stringify([record.planDate, record.blockId]);
        if (seen.has(key)) return [];
        seen.add(key);
        return [
          {
            record,
            title: record.intent?.trim() || task.title,
            day: record.planDate,
          },
        ];
      }),
    )
    .sort(
      (a, b) =>
        b.day.localeCompare(a.day) || b.record.endedAt - a.record.endedAt,
    );
  return {
    days,
    hours: days.reduce((sum, day) => sum + day.hours, 0),
    goalDays: days.filter((day) => day.hours >= 4).length,
    workforms,
  };
}

export function Dashboard({
  state,
  today,
  onPlan,
}: {
  state: PlannerState;
  today: string;
  onPlan: () => void;
}) {
  const currentWeek = dateKey(weekStart(parseDate(today)));
  const [week, setWeek] = useState(currentWeek);
  const [selected, setSelected] = useState<{
    record: FocusRecord;
    title: string;
    day: string;
  } | null>(null);
  const score = weeklyScore(state, week);
  const previous = weeklyScore(state, dateKey(addDays(parseDate(week), -7)));
  const difference = score.hours - previous.hours;
  const format = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, options).format(parseDate(day));
  return (
    <>
      <div className="planner-toolbar dashboard-toolbar">
        <div className="period-controls">
          <h1>Dashboard</h1>
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
              disabled={week >= currentWeek}
              onClick={() => setWeek(dateKey(addDays(parseDate(week), 7)))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="text-button" onClick={() => setWeek(currentWeek)}>
            This week
          </button>
        </div>
        <button className="primary-button" onClick={onPlan}>
          Plan your day <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="dashboard-content">
        <section className="weekly-scoreboard" aria-label="Weekly score">
          <header className="scoreboard-heading">
            <div>
              <h2>
                {week === currentWeek ? 'This week’s score' : 'Weekly score'}
              </h2>
              <p>
                {format(week, { day: 'numeric', month: 'short' })} –{' '}
                {format(score.days[6].day, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <p className="score-comparison">
              {difference > 0
                ? `${difference}h ahead of last week`
                : difference < 0
                  ? `${Math.abs(difference)}h behind last week`
                  : 'Level with last week'}
            </p>
          </header>
          <dl className="score-stats">
            <div>
              <dt>Hours completed</dt>
              <dd>
                {score.hours}
                <span> / 28</span>
              </dd>
            </div>
            <div>
              <dt>Days at goal</dt>
              <dd>
                {score.goalDays}
                <span> / 7</span>
              </dd>
            </div>
            <div>
              <dt>Best day</dt>
              <dd>
                {Math.max(...score.days.map((day) => day.hours))}
                <span>h</span>
              </dd>
            </div>
            <div>
              <dt>Last week</dt>
              <dd>
                {previous.hours}
                <span>h</span>
              </dd>
            </div>
          </dl>
          <div className="week-score-grid" aria-label="Daily focus scores">
            {score.days.map(({ day, hours }) => (
              <div
                key={day}
                className={`score-day ${day === today ? 'is-today' : ''} ${day > today ? 'is-future' : ''}`}
                aria-label={`${format(day, { weekday: 'long', day: 'numeric', month: 'long' })}: ${hours} of 4 hours completed${day > today ? ', upcoming' : ''}`}
              >
                <span className="score-day-name">
                  {format(day, { weekday: 'short' })}
                  <small>{format(day, { day: 'numeric' })}</small>
                </span>
                <div className="score-day-hours" aria-hidden="true">
                  {[4, 3, 2, 1].map((hour) => (
                    <span
                      key={hour}
                      className={hours >= hour ? 'is-earned' : ''}
                    >
                      {hours >= hour && <Check size={13} />}
                    </span>
                  ))}
                </div>
                <strong>
                  {hours}
                  <span> / 4h</span>
                </strong>
              </div>
            ))}
          </div>
          <p className="score-rule">
            One completed hour = one on the board. Aim for four a day.
          </p>
        </section>
        <section
          className="dashboard-workforms"
          aria-labelledby="workforms-heading"
        >
          <header>
            <h2 id="workforms-heading">
              Completed workforms <span>{score.workforms.length}</span>
            </h2>
          </header>
          {score.workforms.length === 0 ? (
            <div className="score-empty">
              <h3>No completed hours recorded this week.</h3>
              <p>
                Finish an hour in Plan and submit its workform. Your work and
                score will appear here.
              </p>
              <button className="secondary-button" onClick={onPlan}>
                Go to Plan <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            [...score.days]
              .reverse()
              .filter(({ day }) =>
                score.workforms.some((form) => form.day === day),
              )
              .map(({ day }) => (
                <div className="workform-day-group" key={day}>
                  <h3>
                    {format(day, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </h3>
                  <div>
                    {score.workforms
                      .filter((form) => form.day === day)
                      .map((form) => (
                        <button
                          className="dashboard-workform"
                          key={`${form.day}-${form.record.blockId}`}
                          onClick={() => setSelected(form)}
                          aria-label={`Read workform: ${form.title}`}
                        >
                          <span className="workform-hour">
                            <Check size={15} aria-hidden="true" /> 1h
                          </span>
                          <span className="workform-preview">
                            <strong>{form.title}</strong>
                            <span>{form.record.progress}</span>
                          </span>
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      ))}
                  </div>
                </div>
              ))
          )}
        </section>
      </div>
      {selected && (
        <Modal
          title={selected.title}
          description={`${format(selected.day, { weekday: 'long', day: 'numeric', month: 'long' })} · 1 focused hour`}
          onClose={() => setSelected(null)}
          initialFocus="button"
        >
          <p className="saved-reflection">{selected.record.progress}</p>
          <footer className="modal-actions">
            <button
              className="primary-button"
              onClick={() => setSelected(null)}
            >
              Close workform
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
