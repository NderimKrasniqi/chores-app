import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
} from '../_generated/server';
import { getClaimUnclaimStatus } from './claimCommitmentRules';
import { getWeeklyUnclaimUsageForChild } from './claimUnclaimAccounting';

export async function unclaimClaimableClaim(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  claimId:
    Id<'choreClaims'>,
  now = Date.now(),
) {
  const household =
    await ctx.db.get(
      householdId,
    );

  if (!household) {
    throw new ConvexError(
      'Household not found.',
    );
  }

  const child =
    await ctx.db.get(
      childId,
    );

  if (
    !child ||
    child.householdId !==
      householdId
  ) {
    throw new ConvexError(
      'Child does not belong to this Household.',
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
    claim.childId !==
    childId
  ) {
    throw new ConvexError(
      'This Claim belongs to another Child.',
    );
  }

  /*
   * Only an actively worked Claim may be
   * voluntarily unclaimed.
   *
   * Once submitted or in redo, the Child
   * has already committed the work for
   * review and cannot use unclaim.
   */
  if (
    claim.state !==
    'claimed'
  ) {
    throw new ConvexError(
      'Only an active unsubmitted Claim can be unclaimed.',
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
   * Both allowance accounting and the
   * exact lock boundary are re-evaluated
   * inside this mutation using server time.
   *
   * The client cannot supply or authorize
   * either value.
   */
  const usage =
    await getWeeklyUnclaimUsageForChild(
      ctx,
      household,
      childId,
      now,
    );

  const status =
    getClaimUnclaimStatus({
      deadlineAt:
        occurrence.deadlineAt,

      now,

      weeklyUnclaimAllowance:
        usage.allowance,

      usedUnclaims:
        usage.usedUnclaims,
    });

  /*
   * D-10:
   *
   * before lockAt => potentially allowed
   * at lockAt      => locked
   * after lockAt   => locked
   */
  if (
    status.isTimeLocked
  ) {
    throw new ConvexError(
      'This Claim is locked because it is within two hours of the deadline.',
    );
  }

  if (
    !status.hasUnclaimAllowance
  ) {
    throw new ConvexError(
      'This Child has no weekly unclaims remaining.',
    );
  }

  /*
   * This patch is the durable accounting
   * event.
   *
   * We do NOT delete the Claim. Historical
   * ownership remains auditable.
   *
   * The Chore Occurrence stays `available`;
   * Claim visibility/claiming ignore
   * historical `unclaimed` Claims, which
   * returns the occurrence to the pool.
   */
  await ctx.db.patch(
    claim._id,
    {
      state:
        'unclaimed',

      unclaimedAt:
        now,
    },
  );

  return {
    claimId:
      claim._id,

    occurrenceId:
      occurrence._id,

    childId,

    state:
      'unclaimed' as const,

    unclaimedAt:
      now,

    payoutWeek:
      usage.payoutWeek,

    remainingUnclaims:
      Math.max(
        status.remainingUnclaims -
          1,
        0,
      ),
  };
}
