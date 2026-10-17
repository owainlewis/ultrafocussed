import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { useCurrentPeriod } from '../src/useCurrentPeriod';
import { Dashboard } from '../src/Dashboard';
import { WeeklyView } from '../src/WeeklyView';
import { DailyPlan } from '../src/DailyPlan';
import { emptyState, parseDate } from '../src/model';
afterEach(cleanup);
const fmt = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(undefined, options).format(parseDate(day));
const short = { day: 'numeric', month: 'short' } as const;
const full = { ...short, year: 'numeric' } as const;

it('follows the current period across midnight but preserves intentional browsing', () => {
  const { result, rerender } = renderHook(
    ({ current }) => useCurrentPeriod(current),
    { initialProps: { current: '2026-10-18' } },
  );
  rerender({ current: '2026-10-19' });
  expect(result.current[0]).toBe('2026-10-19');
  act(() => result.current[1]('2026-10-17'));
  rerender({ current: '2026-10-20' });
  expect(result.current[0]).toBe('2026-10-17');
  act(() => result.current[1]('2026-10-20'));
  rerender({ current: '2026-10-21' });
  expect(result.current[0]).toBe('2026-10-21');
});
it('Dashboard advances from Sunday into Monday and keeps previous-week browsing stable', () => {
  const props = { state: emptyState(), onPlan: vi.fn() };
  const { rerender } = render(<Dashboard {...props} today="2026-10-18" />);
  expect(
    screen.getByText(
      `${fmt('2026-10-12', short)} – ${fmt('2026-10-18', full)}`,
    ),
  ).toBeTruthy();
  rerender(<Dashboard {...props} today="2026-10-19" />);
  expect(
    screen.getByText(
      `${fmt('2026-10-19', short)} – ${fmt('2026-10-25', full)}`,
    ),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
  rerender(<Dashboard {...props} today="2026-10-26" />);
  expect(
    screen.getByText(
      `${fmt('2026-10-12', short)} – ${fmt('2026-10-18', full)}`,
    ),
  ).toBeTruthy();
});
it('Plan advances the current day without inventing saved hours', () => {
  const props = {
    state: emptyState(),
    onChange: vi.fn(),
    onStart: vi.fn(),
    onResume: vi.fn(),
  };
  const { rerender } = render(<DailyPlan {...props} today="2026-10-18" />);
  rerender(<DailyPlan {...props} today="2026-10-19" />);
  expect(
    screen.getByRole('heading', {
      name: fmt('2026-10-19', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    }),
  ).toBeTruthy();
  expect(props.onChange).not.toHaveBeenCalled();
});
it('Weekly displays the new week after Monday rollover', () => {
  const props = { state: emptyState(), onChange: vi.fn() };
  const { rerender } = render(<WeeklyView {...props} today="2026-10-18" />);
  rerender(<WeeklyView {...props} today="2026-10-19" />);
  expect(
    screen.getByText(`${fmt('2026-10-19', full)} – ${fmt('2026-10-25', full)}`),
  ).toBeTruthy();
});
