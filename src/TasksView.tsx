import type { ReactNode } from 'react';

export function TasksView({
  capture,
  empty,
  children,
}: {
  capture: ReactNode;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="tasks-view" aria-label="Tasks">
      <h1 className="visually-hidden">Tasks</h1>
      {capture}
      {children}
      {empty && <p className="empty-note">No tasks yet.</p>}
    </section>
  );
}
