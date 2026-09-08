import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';
import {
  getPayoutWindowForUsage,
} from '../finance/payoutPeriods';

type DatabaseCtx =
  | MutationCtx
  | QueryCtx;

export async function getWeeklyUnclaimUsageForChild(
  ctx: DatabaseCtx,
  household:
    Doc<'households'>,
  childId:
    Id<'children'>,
  now = Date.now(),
) {
  const payoutWeek =
    await getPayoutWindowForUsage(
      ctx,
      household,
      now,
    );

  const unclaims =
    await ctx.db
      .query(
        'choreClaims',
      )
      .withIndex(
        'by_child_unclaimed_at',
        (q) =>
          q
            .eq(
              'childId',
              childId,
            )
            .gte(
              'unclaimedAt',
              payoutWeek.startAt,
            )
            .lt(
              'unclaimedAt',
              payoutWeek.endAt,
            ),
      )
      .collect();

  const usedUnclaims =
    unclaims.filter(
      (claim) =>
        claim.householdId ===
          household._id &&
        claim.unclaimedAt !==
          undefined,
    ).length;

  const remainingUnclaims =
    Math.max(
      household
        .weeklyUnclaimAllowance -
        usedUnclaims,
      0,
    );

  return {
    payoutWeek,

    allowance:
      household
        .weeklyUnclaimAllowance,

    usedUnclaims,

    remainingUnclaims,

    hasUnclaimAllowance:
      remainingUnclaims >
      0,
  };
}
