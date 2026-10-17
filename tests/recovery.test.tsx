import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  act,
} from '@testing-library/react';
import { AppErrorBoundary } from '../src/AppErrorBoundary';
import { usePlannerStorage } from '../src/usePlannerStorage';
import { STORAGE_KEY, createTask } from '../src/model';
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

it('a render failure offers recovery without overwriting saved data', () => {
  const raw = '{"version":1,"tasks":[]}';
  localStorage.setItem(STORAGE_KEY, raw);
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken(): React.ReactNode {
    throw new Error('Test failure');
  }
  render(
    <AppErrorBoundary>
      <Broken />
    </AppErrorBoundary>,
  );
  expect(
    screen.getByRole('heading', { name: 'The planner could not open' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Download saved planner' }),
  ).toBeTruthy();
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  expect(setItem).not.toHaveBeenCalled();
});
it('preserves local work if a write fails, then saves it on retry', () => {
  const setItem = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new Error('Quota');
    });
  const { result } = renderHook(() => usePlannerStorage(vi.fn()));
  const task = createTask('Keep this draft', null);
  act(() => result.current.setState({ version: 1, tasks: [task] }));
  expect(result.current.saveError).toBe(true);
  fireEvent(
    window,
    new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: '{"version":1,"tasks":[]}',
    }),
  );
  expect(result.current.state.tasks[0].title).toBe('Keep this draft');
  setItem.mockRestore();
  act(() => {
    expect(result.current.retry()).toBe(true);
  });
  expect(result.current.saveError).toBe(false);
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).tasks[0].title).toBe(
    'Keep this draft',
  );
});
it('malformed cross-tab updates lock editing without replacing the current planner', () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      tasks: [createTask('Keep saved work', null)],
    }),
  );
  const notify = vi.fn();
  const { result } = renderHook(() => usePlannerStorage(notify));
  fireEvent(
    window,
    new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{bad' }),
  );
  expect(result.current.readError).toBe(true);
  expect(result.current.state.tasks[0].title).toBe('Keep saved work');
  expect(notify).not.toHaveBeenCalled();
});
