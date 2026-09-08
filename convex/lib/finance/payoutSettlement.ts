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
  applyPaidPayoutToFinancialBalance,
} from './financialProjection';
import {
  countPendingOutcomesForChild,
} from './pendingOutcomes';
import {
  calculatePeriodBalanceAtClose,
} from './periodBalance';

function requireWholeSek(
  value: number,
  label: string,
) {
  if (
    !Number.isSafeInteger(
      value,
    )
  ) {
    throw new ConvexError(
      `${label} must be whole SEK.`,
    );
  }
}

export async function createPayoutOutcomesForPeriod(
  ctx:
    MutationCtx,
  period:
    Doc<'payoutPeriods'>,
  now: number,
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
            period.householdId,
          ),
      )
      .collect();

  const payoutIds:
    Array<
      Id<'payouts'>
    > = [];

  for (
    const child of
    children
  ) {
    const existing =
      await ctx.db
        .query(
          'payouts',
        )
        .withIndex(
          'by_period_child',
          (q) =>
            q
              .eq(
                'payoutPeriodId',
                period._id,
              )
              .eq(
                'childId',
                child._id,
              ),
        )
        .unique();

    if (existing) {
      payoutIds.push(
        existing._id,
      );

      continue;
    }

    const balanceAtCloseSek =
      await calculatePeriodBalanceAtClose(
        ctx,
        period,
        child._id,
      );

    requireWholeSek(
      balanceAtCloseSek,
      'Payout balance',
    );

    const amountDueSek =
      Math.max(
        balanceAtCloseSek,
        0,
      );

    const pendingOutcomeCount =
      await countPendingOutcomesForChild(
        ctx,
        period.householdId,
        child._id,
      );

    const payoutId =
      await ctx.db.insert(
        'payouts',
        {
          householdId:
            period.householdId,

          payoutPeriodId:
            period._id,

          childId:
            child._id,

          balanceAtCloseSek,

          amountDueSek,

          pendingOutcomeCount,

          status:
            amountDueSek > 0
              ? 'pending'
              : 'no_payment',

          createdAt:
            now,
        },
      );

    payoutIds.push(
      payoutId,
    );
  }

  return payoutIds;
}

export async function markPayoutPaid(
  ctx:
    MutationCtx,
  payoutId:
    Id<'payouts'>,
  paidByAuthUserId:
    string,
  now =
    Date.now(),
) {
  const payout =
    await ctx.db.get(
      payoutId,
    );

  if (!payout) {
    throw new ConvexError(
      'Payout not found.',
    );
  }

  if (
    payout.status !==
    'pending'
  ) {
    throw new ConvexError(
      'Only a pending payout can be marked paid.',
    );
  }

  if (
    !Number.isSafeInteger(
      payout.amountDueSek,
    ) ||
    payout.amountDueSek <=
      0
  ) {
    throw new ConvexError(
      'Pending payout amount must be positive whole SEK.',
    );
  }

  if (
    !Number.isFinite(
      now,
    )
  ) {
    throw new ConvexError(
      'Payment time must be finite.',
    );
  }

  await applyPaidPayoutToFinancialBalance(
    ctx,
    {
      householdId:
        payout.householdId,

      childId:
        payout.childId,

      amountSek:
        payout.amountDueSek,

      paidAt:
        now,
    },
  );

  await ctx.db.patch(
    payout._id,
    {
      status:
        'paid',

      paidAt:
        now,

      paidByAuthUserId,
    },
  );

  return {
    payoutId:
      payout._id,

    childId:
      payout.childId,

    amountPaidSek:
      payout.amountDueSek,

    paidAt:
      now,

    status:
      'paid' as const,
  };
}
