import type {
  Doc,
  Id,
} from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

export type ReconcileOccurrenceLifecycleResult = {
  found: boolean;

  changed: boolean;

  previousState?:
    Doc<'choreOccurrences'>['state'];

  nextState?:
    Doc<'choreOccurrences'>['state'];
};

export async function reconcileOccurrenceLifecycle(
  ctx: MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
  now = Date.now(),
): Promise<ReconcileOccurrenceLifecycleResult> {
  const occurrence =
    await ctx.db.get(
      occurrenceId,
    );

  /*
   * Scheduled callbacks may outlive
   * development/test data cleanup.
   *
   * Missing data is therefore a safe
   * no-op rather than an error.
   */
  if (!occurrence) {
    return {
      found: false,
      changed: false,
    };
  }

  const previousState =
    occurrence.state;

  /*
   * Only unresolved pre-submission
   * states are time-driven here.
   *
   * Once submitted, review delay must
   * never turn the occurrence into a
   * miss.
   */
  if (
    previousState !==
      'scheduled' &&
    previousState !==
      'available'
  ) {
    return {
      found: true,
      changed: false,
      previousState,
      nextState:
        previousState,
    };
  }

  let nextState:
    Doc<'choreOccurrences'>['state'] =
      previousState;

  if (
    nextState ===
      'scheduled' &&
    now >=
      occurrence
        .availabilityStartsAt
  ) {
    nextState =
      'available';
  }

  /*
   * Claimable:
   *
   * At the deadline boundary an
   * unresolved, unclaimed occurrence
   * expires.
   *
   * TASK-10 will extend this rule once
   * Claims exist.
   */
  if (
    occurrence.kind ===
      'claimable' &&
    nextState ===
      'available' &&
    now >=
      occurrence.deadlineAt
  ) {
    nextState =
      'expired_unclaimed';
  }

  /*
   * Personal:
   *
   * Submission AT the deadline is valid.
   *
   * Therefore the occurrence becomes
   * missed only strictly AFTER the
   * deadline when no valid submission
   * changed the state first.
   */
  if (
    occurrence.kind ===
      'personal' &&
    nextState ===
      'available' &&
    now >
      occurrence.deadlineAt
  ) {
    nextState =
      'missed';
  }

  if (
    nextState ===
    previousState
  ) {
    return {
      found: true,
      changed: false,
      previousState,
      nextState,
    };
  }

  await ctx.db.patch(
    occurrenceId,
    {
      state:
        nextState,
    },
  );

  return {
    found: true,
    changed: true,
    previousState,
    nextState,
  };
}
