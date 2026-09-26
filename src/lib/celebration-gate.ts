import { useEffect, useSyncExternalStore } from "react";

/*
 * Full-screen quest cards hold approval celebrations back while they're open,
 * so a celebration never lands on top of sending work. Module-level because
 * the cards and the child shell don't share a parent that could own it.
 */
let holds = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/*
 * iOS won't present a modal while another is still dismissing, so the hold
 * outlives the card by its slide-out.
 */
const RELEASE_AFTER_MS = 450;

/** Hold celebrations while `active` (e.g. a quest card is visible). */
export function useHoldCelebrations(active: boolean) {
  useEffect(() => {
    if (!active) return;
    holds += 1;
    emit();
    return () => {
      setTimeout(() => {
        holds -= 1;
        emit();
      }, RELEASE_AFTER_MS);
    };
  }, [active]);
}

export function useCelebrationsHeld() {
  return useSyncExternalStore(
    subscribe,
    () => holds > 0,
    () => false,
  );
}
