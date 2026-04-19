"use client";

import { useMemo } from "react";

// anonymous persistent session ID for identifying participants without auth
export function useSessionId(): string {
  return useMemo(() => {
    if (typeof window === "undefined") return "ssr";
    const key = "duet-session-id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }, []);
}
