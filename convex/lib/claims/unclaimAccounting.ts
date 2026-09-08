import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';
import { getCurrentPayoutWeekWindow } from './commitmentRules';

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
    getCurrentPayoutWeekWindow({
      now,

      timezone:
        household.timezone,

      payoutWeekday:
        household
          .payoutWeekday,
    });

  /*
   * Only successful Child-initiated
   * unclaims carry unclaimedAt.
   *
   * Parent cancellation therefore cannot
   * consume this allowance accidentally.
   */
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

  /*
   * childId is Household-owned already,
   * but retain the Household check as a
   * defensive domain boundary.
   */
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
