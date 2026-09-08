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

async function sumLedgerEntries(
  entries:
    Doc<'ledgerEntries'>[],
  householdId:
    Id<'households'>,
) {
  let totalSek =
    0;

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

/*
 * Bootstrap only.
 *
 * A Child's first ever Payout has no prior
 * period checkpoint, so we derive its
 * cumulative gross position once.
 *
 * Every later Payout uses only:
 *
 * - the previous Payout;
 * - Ledger Entries inside this period.
 */
async function getInitialGrossBefore(
  ctx:
    MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  cutoffAt:
    number,
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

  return await sumLedgerEntries(
    entries,
    householdId,
  );
}

async function getPeriodFinancialEffects(
  ctx:
    MutationCtx,
  period:
    Doc<'payoutPeriods'>,
  childId:
    Id<'children'>,
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
            .gte(
              'createdAt',
              period.startAt,
            )
            .lt(
              'createdAt',
              period.endAt,
            ),
      )
      .collect();

  return await sumLedgerEntries(
    entries,
    period.householdId,
  );
}

async function findPreviousPayout(
  ctx:
    MutationCtx,
  period:
    Doc<'payoutPeriods'>,
  childId:
    Id<'children'>,
) {
  const previousPeriod =
    await ctx.db
      .query(
        'payoutPeriods',
      )
      .withIndex(
        'by_household_start_at',
        (q) =>
          q
            .eq(
              'householdId',
              period.householdId,
            )
            .lt(
              'startAt',
              period.startAt,
            ),
      )
      .order(
        'desc',
      )
      .first();

  if (!previousPeriod) {
    return null;
  }

  return await ctx.db
    .query(
      'payouts',
    )
    .withIndex(
      'by_period_child',
      (q) =>
        q
          .eq(
            'payoutPeriodId',
            previousPeriod._id,
          )
          .eq(
            'childId',
            childId,
          ),
    )
    .unique();
}

export async function calculatePeriodBalanceAtClose(
  ctx:
    MutationCtx,
  period:
    Doc<'payoutPeriods'>,
  childId:
    Id<'children'>,
) {
  const previousPayout =
    await findPreviousPayout(
      ctx,
      period,
      childId,
    );

  /*
   * No previous Child Payout means this is
   * the Child's bootstrap checkpoint.
   *
   * This also handles a Child added after
   * the Household already had earlier
   * Payout Periods.
   */
  if (!previousPayout) {
    return await getInitialGrossBefore(
      ctx,
      period.householdId,
      childId,
      period.endAt,
    );
  }

  if (
    previousPayout.householdId !==
    period.householdId
  ) {
    throw new ConvexError(
      'Previous Payout Household mismatch.',
    );
  }

  requireWholeSek(
    previousPayout.balanceAtCloseSek,
    'Previous payout balance',
  );

  requireWholeSek(
    previousPayout.amountDueSek,
    'Previous payout amount',
  );

  const expectedPreviousReservation =
    Math.max(
      previousPayout.balanceAtCloseSek,
      0,
    );

  if (
    previousPayout.amountDueSek !==
    expectedPreviousReservation
  ) {
    throw new ConvexError(
      'Previous Payout reservation does not match its closing balance.',
    );
  }

  /*
   * Positive previous balance was already
   * reserved by its Payout and therefore
   * must not appear again.
   *
   * Negative balance carries forward.
   */
  const carrySek =
    Math.min(
      previousPayout.balanceAtCloseSek,
      0,
    );

  const periodEffectsSek =
    await getPeriodFinancialEffects(
      ctx,
      period,
      childId,
    );

  const balanceAtCloseSek =
    carrySek +
    periodEffectsSek;

  requireWholeSek(
    balanceAtCloseSek,
    'Payout balance',
  );

  return balanceAtCloseSek;
}
