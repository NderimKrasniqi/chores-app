import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * "Now" rounded to the minute, for query arguments: stable enough for
 * Convex to cache, and moves forward while the screen stays open and when
 * the app comes back to the front.
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
