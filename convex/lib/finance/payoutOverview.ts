import {
  ConvexError,
} from 'convex/values';

import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import type {
  QueryCtx,
} from '../../_generated/server';
import {
  calculateRunningBalanceForChild,
} from './financialProjection';

async function projectPayout(
  ctx:
    QueryCtx,
  householdId:
    Id<'households'>,
  payout:
    Doc<'payouts'>,
) {
  if (
    payout.householdId !==
    householdId
  ) {
    throw new ConvexError(
      'Payout Household mismatch.',
    );
  }

  const period =
    await ctx.db.get(
      payout.payoutPeriodId,
    );

  if (!period) {
    throw new ConvexError(
      'Payout Period not found.',
    );
  }

  if (
    period.householdId !==
    householdId
  ) {
    throw new ConvexError(
      'Payout Period Household mismatch.',
    );
  }

  return {
    payoutId:
      payout._id,

    payoutPeriodId:
      period._id,

    periodEndLocalDate:
      period.endLocalDate,

    balanceAtCloseSek:
      payout.balanceAtCloseSek,

    amountDueSek:
      payout.amountDueSek,

    pendingOutcomeCount:
      payout.pendingOutcomeCount,

    status:
      payout.status,

    paidAt:
      payout.paidAt ??
      null,
  };
}

export async function listPayoutOverviewForChildren(
  ctx:
    QueryCtx,
  householdId:
    Id<'households'>,
) {
  const children =
    await ctx.db
      .query(
        'children',
      )
      .withIndex(
        'by_household',
        (q) =>
          q.eq(
            'householdId',
            householdId,
          ),
      )
      .collect();

  const result = [];

  for (
    const child of
    children
  ) {
    const [
      balance,
      pendingPayouts,
      latestPayout,
    ] =
      await Promise.all([
        calculateRunningBalanceForChild(
          ctx,
          child._id,
        ),

        ctx.db
          .query(
            'payouts',
          )
          .withIndex(
            'by_child_status_created_at',
            (q) =>
              q
                .eq(
                  'childId',
                  child._id,
                )
                .eq(
                  'status',
                  'pending',
                ),
          )
          .order(
            'desc',
          )
          .collect(),

        ctx.db
          .query(
            'payouts',
          )
          .withIndex(
            'by_child_created_at',
            (q) =>
              q.eq(
                'childId',
                child._id,
              ),
          )
          .order(
            'desc',
          )
          .first(),
      ]);

    if (
      balance.householdId !==
      householdId
    ) {
      throw new ConvexError(
        'Running Balance Household mismatch.',
      );
    }

    const pendingProjections =
      await Promise.all(
        pendingPayouts.map(
          (payout) =>
            projectPayout(
              ctx,
              householdId,
              payout,
            ),
        ),
      );

    let latestProjection =
      null;

    if (latestPayout) {
      latestProjection =
        await projectPayout(
          ctx,
          householdId,
          latestPayout,
        );
    }

    result.push({
      childId:
        child._id,

      displayName:
        child.displayName,

      runningBalanceSek:
        balance.balanceSek,

      pendingPayouts:
        pendingProjections,

      latestPayout:
        latestProjection,
    });
  }

  return result;
}
