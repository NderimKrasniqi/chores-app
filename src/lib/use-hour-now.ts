import { useEffect, useState } from "react";
import { AppState } from "react-native";

const HOUR_MS = 60 * 60_000;

/**
 * "Now" rounded to the hour, for query arguments that only need a rough
 * window (the last week): stable, so the query isn't torn down and
 * refetched every minute, but it still moves forward while the app is open.
 */
export function useHourNow() {
  const round = () => Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
  const [now, setNow] = useState(round);
  useEffect(() => {
    const refresh = () => setNow(round());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const timer = setInterval(refresh, 5 * 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);
  return now;
}

/**
 * "Now" rounded to the minute, for countdowns a kid reads ("closes in
 * 1 h 20 min"): ticks once a minute and on return to the app, never per
 * frame.
 */
export function useMinuteNow() {
  const round = () => Math.floor(Date.now() / 60_000) * 60_000;
  const [now, setNow] = useState(round);
  useEffect(() => {
    const refresh = () => setNow(round());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const timer = setInterval(refresh, 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);
  return now;
}

/**
 * Keeps showing the last result while a query with new arguments loads,
 * instead of flashing back to `undefined`.
 */
export function useStickyValue<T>(value: T | undefined) {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return value ?? last;
}
