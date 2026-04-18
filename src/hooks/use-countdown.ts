"use client";

import { useState, useCallback, useRef } from "react";

export function useCountdown(seconds = 3) {
  const [count, setCount] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const run = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      let remaining = seconds;
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
  }, [seconds]);

  const cancel = useCallback(() => {
    clearInterval(timerRef.current);
    setCount(null);
  }, []);

  return { count, run, cancel };
}
