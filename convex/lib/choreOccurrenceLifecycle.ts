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
   * TASK-07 currently owns only:
   *
   * scheduled -> available
   * available Claimable ->
   * expired_unclaimed
   *
   * Later TASKs own submission,
   * review, cancellation, failure,
   * and claim lifecycle rules.
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

  /*
   * Explicitly keep the full occurrence
   * state union here.
   *
   * Without this annotation TypeScript
   * narrows nextState to only:
   *
   * 'scheduled' | 'available'
   *
   * which prevents us from assigning
   * 'expired_unclaimed' below.
   */
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
   * At the deadline boundary an
   * unresolved Claimable occurrence
   * expires unclaimed.
   *
   * TASK-10 will extend this guard to
   * verify that no active Claim exists
   * before applying this transition.
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
