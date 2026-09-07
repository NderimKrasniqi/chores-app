import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
} from '../_generated/server';

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
  now = Date.now(),
) {
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
   * Parent cancellation is terminal for
   * this Claim and occurrence.
   *
   * It deliberately does NOT write
   * unclaimedAt. Parent cancellation must
   * never consume the Child's weekly
   * unclaim allowance.
   *
   * It also creates no Ledger Entry.
   * Therefore there is no financial
   * penalty.
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
