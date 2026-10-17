import { useEffect, useRef, useState } from 'react';
import {
  decodeState,
  emptyState,
  STORAGE_KEY,
  type PlannerState,
} from './model';

function readPlanner() {
  try {
    return {
      state: decodeState(localStorage.getItem(STORAGE_KEY)),
      error: false,
    };
  } catch {
    return { state: emptyState(), error: true };
  }
}

/** A failed read never replaces stored data; a failed write keeps local work in memory. */
export function usePlannerStorage(onExternalChange: () => void) {
  const [initial] = useState(readPlanner);
  const [state, setState] = useState<PlannerState>(initial.state);
  const [readError, setReadError] = useState(initial.error);
  const [saveError, setSaveError] = useState(false);
  const externalChange = useRef(onExternalChange);
  useEffect(() => {
    externalChange.current = onExternalChange;
  });
  useEffect(() => {
    if (readError) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [state, readError]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      if (saveError || readError) return;
      try {
        setState(decodeState(event.newValue));
        externalChange.current();
      } catch {
        setReadError(true);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [readError, saveError]);
  const retry = () => {
    try {
      if (readError) {
        setState(decodeState(localStorage.getItem(STORAGE_KEY)));
        setReadError(false);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSaveError(false);
      }
      return true;
    } catch {
      return false;
    }
  };
  const restore = (backup: PlannerState) => {
    setState(backup);
    setReadError(false);
  };
  return { state, setState, readError, saveError, retry, restore };
}
