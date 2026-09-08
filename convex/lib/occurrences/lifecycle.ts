import {
  ConvexError,
} from 'convex/values';

import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';
import {
  ensureClaimableFailurePenalty,
} from '../finance/failurePenalty';

export type ReconcileOccurrenceLifecycleResult = {
  found:
    boolean;

  changed:
    boolean;

  previousState?:
    Doc<'choreOccurrences'>['state'];

  nextState?:
    Doc<'choreOccurrences'>['state'];
};

async function getClaimableDeadlineOwnership(
  ctx:
    MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
) {
  const claims =
    await ctx.db
      .query(
        'choreClaims',
      )
      .withIndex(
        'by_occurrence',
        (query) =>
          query.eq(
            'occurrenceId',
            occurrenceId,
          ),
      )
      .collect();

  /*
   * Only a still-unsubmitted `claimed`
   * commitment can fail against the
   * original occurrence deadline.
   *
   * submitted / redo_required already
   * moved into later lifecycle stages.
   */
  const activeUnsubmittedClaims =
    claims.filter(
      (claim) =>
        claim.state ===
        'claimed',
    );

  if (
    activeUnsubmittedClaims.length >
    1
  ) {
    throw new ConvexError(
      'Claimable Chore has multiple active unsubmitted Claims.',
    );
  }

  const activeUnsubmittedClaim =
    activeUnsubmittedClaims[0] ??
    null;

  /*
   * An occurrence is truly unclaimed only
   * when no durable Claim still owns its
   * outcome.
   *
   * Voluntary unclaim and Parent
   * cancellation stop protecting the
   * available occurrence from ordinary
   * expired-unclaimed behavior.
   *
   * submitted / redo_required / approved /
   * failed remain protected defensively so
   * inconsistent delayed lifecycle work
   * cannot mislabel them as unclaimed.
   */
  const protectedFromUnclaimedExpiry =
    claims.some(
      (claim) =>
        claim.state !==
          'unclaimed' &&
        claim.state !==
          'cancelled',
    );

  return {
    activeUnsubmittedClaim,

    protectedFromUnclaimedExpiry,
  };
}

export async function reconcileOccurrenceLifecycle(
  ctx:
    MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
  now =
    Date.now(),
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
      found:
        false,

      changed:
        false,
    };
  }

  const previousState =
    occurrence.state;

  /*
   * Only unresolved pre-submission states
   * are time-driven by the original
   * occurrence deadline.
   *
   * submitted and redo_required are
   * governed by Parent review / Redo
   * lifecycle instead.
   */
  if (
    previousState !==
      'scheduled' &&
    previousState !==
      'available'
  ) {
    return {
      found:
        true,

      changed:
        false,

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

  if (
    occurrence.kind ===
      'claimable' &&
    nextState ===
      'available' &&
    now >=
      occurrence.deadlineAt
  ) {
    const {
      activeUnsubmittedClaim,
      protectedFromUnclaimedExpiry,
    } =
      await getClaimableDeadlineOwnership(
        ctx,
        occurrenceId,
      );

    /*
     * D-04 / D-12:
     *
     * submission AT deadlineAt is valid.
     *
     * A still-owned, unsubmitted Claim
     * therefore fails only strictly AFTER
     * the immutable original deadline.
     *
     * Claim failure, occurrence failure,
     * and its Ledger penalty all execute
     * inside this one Convex transaction.
     */
    if (
      activeUnsubmittedClaim &&
      now >
        occurrence.deadlineAt
    ) {
      if (
        activeUnsubmittedClaim
          .householdId !==
        occurrence.householdId
      ) {
        throw new ConvexError(
          'Claim Household does not match its Chore Occurrence.',
        );
      }

      await ctx.db.patch(
        activeUnsubmittedClaim._id,
        {
          state:
            'failed',
        },
      );

      await ctx.db.patch(
        occurrence._id,
        {
          state:
            'failed',
        },
      );

      await ensureClaimableFailurePenalty(
        ctx,
        activeUnsubmittedClaim._id,
        now,
      );

      return {
        found:
          true,

        changed:
          true,

        previousState,

        nextState:
          'failed',
      };
    }

    /*
     * Never claimed, voluntarily unclaimed,
     * or Parent-cancelled ownership no
     * longer protects an otherwise
     * available occurrence.
     *
     * At the exact deadline an active Claim
     * remains protected because the Child
     * may still submit at that instant.
     */
    if (
      !protectedFromUnclaimedExpiry
    ) {
      nextState =
        'expired_unclaimed';
    }
  }

  /*
   * Personal submission AT deadlineAt is
   * valid.
   *
   * Personal chores never create debt.
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

  const stateChanged =
    nextState !==
    previousState;

  const shouldMarkAvailabilityReached =
    occurrence
      .availabilityReachedAt ===
      undefined &&
    now >=
      occurrence
        .availabilityStartsAt;

  if (
    !stateChanged &&
    !shouldMarkAvailabilityReached
  ) {
    return {
      found:
        true,

      changed:
        false,

      previousState,

      nextState,
    };
  }

  await ctx.db.patch(
    occurrenceId,
    {
      ...(stateChanged
        ? {
            state:
              nextState,
          }
        : {}),

      ...(shouldMarkAvailabilityReached
        ? {
            availabilityReachedAt:
              occurrence
                .availabilityStartsAt,
          }
        : {}),
    },
  );

  return {
    found:
      true,

    changed:
      stateChanged,

    previousState,

    nextState,
  };
}
