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

function requireWholeSek(
  value: number,
  name: string,
) {
  if (
    !Number.isSafeInteger(
      value,
    )
  ) {
    throw new ConvexError(
      `${name} must be whole SEK.`,
    );
  }
}

async function getGrossFinancialEffectsBefore(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  cutoffAt: number,
) {
  const entries =
    await ctx.db
      .query(
        'ledgerEntries',
      )
      .withIndex(
        'by_child_created_at',
        (q) =>
          q
            .eq(
              'childId',
              childId,
            )
            .lt(
              'createdAt',
              cutoffAt,
            ),
      )
      .collect();

  let totalSek = 0;

  for (
    const entry of
    entries
  ) {
    if (
      entry.householdId !==
      householdId
    ) {
      throw new ConvexError(
        'Ledger Entry Household does not match payout Child.',
      );
    }

    requireWholeSek(
      entry.amountSek,
      'Ledger Entry amount',
    );

    totalSek +=
      entry.amountSek;

    requireWholeSek(
      totalSek,
      'Financial total',
    );
  }

  return totalSek;
}

async function getPriorReservedPayouts(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  currentPeriod:
    Doc<'payoutPeriods'>,
) {
  const payouts =
    await ctx.db
      .query(
        'payouts',
      )
      .withIndex(
        'by_child',
        (q) =>
          q.eq(
            'childId',
            childId,
          ),
      )
      .collect();

  let reservedSek = 0;

  for (
    const payout of
    payouts
  ) {
    if (
      payout.householdId !==
      householdId
    ) {
      throw new ConvexError(
        'Payout Household does not match Child.',
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

    /*
     * A previous positive payout reserves
     * that amount even while its Swish
     * payment is still pending.
     *
     * This prevents the same earnings from
     * appearing again in a later payout.
     */
    if (
      period.endAt <=
      currentPeriod.startAt
    ) {
      reservedSek +=
        payout.amountDueSek;

      requireWholeSek(
        reservedSek,
        'Reserved payout total',
      );
    }
  }

  return reservedSek;
}

async function countPendingOutcomesForChild(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
) {
  const occurrences =
    await ctx.db
      .query(
        'choreOccurrences',
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

  const personalPending =
    occurrences.filter(
      (occurrence) =>
        occurrence.kind ===
          'personal' &&
        occurrence.personalChildId ===
          childId &&
        (
          occurrence.state ===
            'submitted' ||
          occurrence.state ===
            'redo_required'
        ),
    ).length;

  const claims =
    await ctx.db
      .query(
        'choreClaims',
      )
      .withIndex(
        'by_child',
        (q) =>
          q.eq(
            'childId',
            childId,
          ),
      )
      .collect();

  const claimablePending =
    claims.filter(
      (claim) =>
        claim.householdId ===
          householdId &&
        (
          claim.state ===
            'submitted' ||
          claim.state ===
            'redo_required'
        ),
    ).length;

  return (
    personalPending +
    claimablePending
  );
}

export async function createPayoutOutcomesForPeriod(
  ctx: MutationCtx,
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

    const grossSek =
      await getGrossFinancialEffectsBefore(
        ctx,
        period.householdId,
        child._id,
        period.endAt,
      );

    const reservedSek =
      await getPriorReservedPayouts(
        ctx,
        period.householdId,
        child._id,
        period,
      );

    const balanceAtCloseSek =
      grossSek -
      reservedSek;

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
  ctx: MutationCtx,
  payoutId:
    Id<'payouts'>,
  paidByAuthUserId:
    string,
  now = Date.now(),
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
