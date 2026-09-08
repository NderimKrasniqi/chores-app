import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';

const parentCancellableClaimStates = [
  'claimed',
  'submitted',
  'redo_required',
] as const;

export async function cancelClaimableClaimForParent(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  claimId:
    Id<'choreClaims'>,
  cancelledByAuthUserId:
    string,
  now =
    Date.now(),
) {
  if (
    !Number.isFinite(
      now,
    )
  ) {
    throw new ConvexError(
      'Cancellation timestamp must be finite.',
    );
  }

  const claim =
    await ctx.db.get(
      claimId,
    );

  if (!claim) {
    throw new ConvexError(
      'Claim not found.',
    );
  }

  if (
    claim.householdId !==
    householdId
  ) {
    throw new ConvexError(
      'This Claim does not belong to this Household.',
    );
  }

  if (
    !parentCancellableClaimStates.includes(
      claim.state as
        (typeof parentCancellableClaimStates)[number],
    )
  ) {
    throw new ConvexError(
      'Only an unresolved Claim can be cancelled.',
    );
  }

  const occurrence =
    await ctx.db.get(
      claim.occurrenceId,
    );

  if (
    !occurrence ||
    occurrence.householdId !==
      householdId ||
    occurrence.kind !==
      'claimable'
  ) {
    throw new ConvexError(
      'Claimable Chore occurrence not found.',
    );
  }

  /*
   * Original commitment.
   *
   * Submission AT deadlineAt is valid.
   *
   * Therefore Parent cancellation also
   * remains penalty-free through the exact
   * original deadline.
   *
   * Once now > deadlineAt, a Claim still
   * in `claimed` has already missed its
   * commitment and cannot use Parent
   * cancellation to erase the consequence.
   */
  if (
    claim.state ===
      'claimed' &&
    now >
      occurrence.deadlineAt
  ) {
    throw new ConvexError(
      'This Claim has already missed its deadline and can no longer be cancelled.',
    );
  }

  /*
   * Redo commitment.
   *
   * The original occurrence deadline is
   * intentionally irrelevant here.
   *
   * A Redo has its own immutable
   * Parent-authored deadline.
   */
  if (
    claim.state ===
    'redo_required'
  ) {
    const redo =
      await ctx.db
        .query(
          'choreRedos',
        )
        .withIndex(
          'by_occurrence',
          (q) =>
            q.eq(
              'occurrenceId',
              occurrence._id,
            ),
        )
        .unique();

    if (!redo) {
      throw new ConvexError(
        'Redo opportunity not found.',
      );
    }

    if (
      redo.householdId !==
      householdId
    ) {
      throw new ConvexError(
        'Redo Household does not match its Chore Occurrence.',
      );
    }

    if (
      !Number.isFinite(
        redo.deadlineAt,
      )
    ) {
      throw new ConvexError(
        'Redo deadline must be finite.',
      );
    }

    /*
     * Redo submission AT deadlineAt is
     * valid.
     *
     * Strictly after it, a still
     * redo_required Claim has already
     * failed by time.
     */
    if (
      now >
      redo.deadlineAt
    ) {
      throw new ConvexError(
        'This Redo has already missed its deadline and can no longer be cancelled.',
      );
    }
  }

  /*
   * A submitted Claim is intentionally
   * still cancellable after its applicable
   * submission deadline.
   *
   * Its persisted submission timestamp
   * already proves whether the Child met
   * the deadline, so Parent review delay
   * cannot turn it into a missed
   * commitment.
   */

  await ctx.db.patch(
    claim._id,
    {
      state:
        'cancelled',

      cancelledAt:
        now,

      cancelledByAuthUserId,
    },
  );

  await ctx.db.patch(
    occurrence._id,
    {
      state:
        'cancelled',
    },
  );

  return {
    claimId:
      claim._id,

    occurrenceId:
      occurrence._id,

    childId:
      claim.childId,

    state:
      'cancelled' as const,

    cancelledAt:
      now,

    cancelledByAuthUserId,
  };
}
