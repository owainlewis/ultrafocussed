import { useEffect, useState } from 'react';
import { dateKey } from './model';

export function useToday() {
  const [today, setToday] = useState(() => dateKey(new Date()));
  useEffect(() => {
    const update = () => setToday(dateKey(new Date()));
    const nextDay = new Date();
    nextDay.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(update, nextDay.getTime() - Date.now());
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [today]);
  return today;
}
