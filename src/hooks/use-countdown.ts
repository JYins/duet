"use client";

import { useState, useCallback, useRef } from "react";

export function useCountdown(defaultSeconds = 5) {
  const [count, setCount] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const run = useCallback(
    (seconds?: number): Promise<void> => {
      const duration = seconds ?? defaultSeconds;
      return new Promise((resolve) => {
        let remaining = duration;
        setCount(remaining);

        timerRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            clearInterval(timerRef.current);
            setCount(null);
            resolve();
          } else {
            setCount(remaining);
          }
        }, 1000);
      });
    },
    [defaultSeconds],
  );

  const cancel = useCallback(() => {
    clearInterval(timerRef.current);
    setCount(null);
  }, []);

  return { count, run, cancel };
}
