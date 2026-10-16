import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MonthView, YearView } from '../src/WarMapViews';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('shades only past dates and advances the boundary at local midnight', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 16, 23, 59, 59));
  const { container } = render(
    <MonthView
      month={new Date(2026, 9, 1)}
      tasks={[]}
      selected="2026-10-16"
      onSelect={() => {}}
      renderDay={() => null}
      dropProps={() => ({})}
    />,
  );
  const date = (day: string) =>
    Array.from(container.querySelectorAll('.month-day')).find(
      (cell) => cell.querySelector('.month-date > span')?.textContent === day,
    )!;
  expect(date('15').classList.contains('past-day')).toBe(true);
  expect(date('16').classList.contains('past-day')).toBe(false);
  expect(date('17').classList.contains('past-day')).toBe(false);
  act(() => vi.advanceTimersByTime(1000));
  expect(date('16').classList.contains('past-day')).toBe(true);
  expect(date('17').classList.contains('month-today')).toBe(true);
});

it('uses the same past-date boundary across years in Year view', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 1, 12));
  const { container } = render(
    <YearView year={2025} tasks={[]} onMonth={() => {}} onDay={() => {}} />,
  );
  expect(container.querySelectorAll('.mini-days button.past-day')).toHaveLength(
    365,
  );
});
