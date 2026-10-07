// src/hooks/useLocalDateString.ts
import { useCallback } from "react";

/**
 * Hook: useLocalDateString
 *
 * Formats a Date into a YYYY-MM-DD string with no timezone offset.
 * Returns a function: (date: Date) => string
 */
export default function useLocalDateString() {
  return useCallback((date: Date): string => {
    const tzOffsetMs = date.getTimezoneOffset() * 60_000;
    const utcMidnight = new Date(date.getTime() - tzOffsetMs);
    return utcMidnight.toISOString().split("T")[0];
  }, []);
}
