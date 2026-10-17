import { useEffect, useRef, useState } from 'react';

/** Follow midnight/week rollover only while the user is viewing the current period. */
export function useCurrentPeriod(current: string) {
  const [selected, setSelected] = useState(current);
  const previous = useRef(current);
  useEffect(() => {
    const before = previous.current;
    previous.current = current;
    setSelected((value) => (value === before ? current : value));
  }, [current]);
  return [selected, setSelected] as const;
}
