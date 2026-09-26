import { useSyncExternalStore } from "react";

/*
 * Where a tapped push notification wants to take the user. Set by the push
 * bridge (on tap, or on a cold start from a tap), consumed once by whichever
 * shell is showing — the child shell or the parent shell.
 */
export type NotificationIntent = {
  eventKind: string;
  occurrenceId?: string;
  claimId?: string;
  submissionId?: string;
};

let current: NotificationIntent | null = null;
let seenIdentifiers = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setNotificationIntent(
  identifier: string,
  data: Record<string, unknown> | undefined,
) {
  // The same response can arrive both as "last response" and via listener.
  if (seenIdentifiers.has(identifier)) return;
  seenIdentifiers = new Set([...seenIdentifiers, identifier]);
  if (!data || typeof data.eventKind !== "string") return;
  current = {
    eventKind: data.eventKind,
    occurrenceId:
      typeof data.occurrenceId === "string" ? data.occurrenceId : undefined,
    claimId: typeof data.claimId === "string" ? data.claimId : undefined,
    submissionId:
      typeof data.submissionId === "string" ? data.submissionId : undefined,
  };
  emit();
}

export function clearNotificationIntent() {
  current = null;
  emit();
}

export function useNotificationIntent() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
    () => null,
  );
}

/**
 * Hand each intent (including one already waiting from a cold start) to
 * `handler` exactly once, then clear it. Returns an unsubscribe function.
 */
export function onNotificationIntent(
  handler: (intent: NotificationIntent) => void,
) {
  let active = true;
  const deliver = () => {
    if (!active || !current) return;
    const intent = current;
    current = null;
    handler(intent);
  };
  listeners.add(deliver);
  void Promise.resolve().then(deliver);
  return () => {
    active = false;
    listeners.delete(deliver);
  };
}
