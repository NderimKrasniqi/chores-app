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

async function claimPreventsUnclaimedExpiry(
  ctx: MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
) {
  const claims =
    await ctx.db
      .query('choreClaims')
      .withIndex(
        'by_occurrence',
        (
          query,
        ) =>
          query.eq(
            'occurrenceId',
            occurrenceId,
          ),
      )
      .collect();

  /*
   * A Claimable occurrence is not
   * "unclaimed" while it has an active
   * Claim.
   *
   * Approved/failed are also protected
   * defensively: later lifecycle tasks
   * should move the occurrence itself
   * into the matching terminal state,
   * but it must never be mislabeled
   * expired_unclaimed in the meantime.
   *
   * Voluntarily unclaimed or cancelled
   * Claims no longer protect the
   * occurrence. TASK-11 can therefore
   * return those occurrences to the
   * available pool while time remains.
   */
  return claims.some(
    (
      claim,
    ) =>
      claim.state !==
        'unclaimed' &&
      claim.state !==
        'cancelled',
  );
}

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
   * unresolved occurrence expires only
   * when it truly has no active or
   * completed Claim ownership.
   *
   * A claimed occurrence remains under
   * the Claim lifecycle instead of
   * becoming expired_unclaimed.
   */
  if (
    occurrence.kind ===
      'claimable' &&
    nextState ===
      'available' &&
    now >=
      occurrence.deadlineAt
  ) {
    const protectedByClaim =
      await claimPreventsUnclaimedExpiry(
        ctx,
        occurrenceId,
      );

    if (
      !protectedByClaim
    ) {
      nextState =
        'expired_unclaimed';
    }
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
