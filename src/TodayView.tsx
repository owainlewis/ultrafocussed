import type { ReactNode, HTMLAttributes } from 'react';

export function TodayView({
  capture,
  empty,
  dropProps,
  children,
}: {
  capture: ReactNode;
  empty: boolean;
  dropProps: HTMLAttributes<HTMLElement>;
  children: ReactNode;
}) {
  return (
    <section className="today-view" aria-label="Today's tasks" {...dropProps}>
      {capture}
      {children}
      {empty && <p className="empty-note">No tasks for today.</p>}
    </section>
  );
}
