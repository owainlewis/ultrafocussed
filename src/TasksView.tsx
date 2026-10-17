import type { ReactNode } from 'react';

export function TasksView({
  capture,
  empty,
  children,
  hasTasks,
  showCompleted,
  onShowCompleted,
}: {
  capture: ReactNode;
  empty: boolean;
  children: ReactNode;
  hasTasks: boolean;
  showCompleted: boolean;
  onShowCompleted: (show: boolean) => void;
}) {
  return (
    <section className="tasks-view" aria-label="Tasks">
      <h1 className="visually-hidden">Tasks</h1>
      {capture}
      <div className="tasks-filter">
        <label>
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) => onShowCompleted(event.target.checked)}
          />
          Show completed
        </label>
      </div>
      {children}
      {empty && (
        <p className="empty-note">
          {hasTasks && !showCompleted ? 'No open tasks.' : 'No tasks yet.'}
        </p>
      )}
    </section>
  );
}
