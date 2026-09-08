import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';

type RunningBalanceCtx =
  | QueryCtx
  | MutationCtx;

export type RunningBalance = {
  childId:
    Id<'children'>;

  householdId:
    Id<'households'>;

  earningTotalSek:
    number;

  penaltyTotalSek:
    number;

  settledTotalSek:
    number;

  balanceSek:
    number;

  entryCount:
    number;
};

function requireSafeWholeSek(
  value: number,
  message: string,
) {
  if (
    !Number.isSafeInteger(
      value,
    )
  ) {
    throw new ConvexError(
      message,
    );
  }
}

export async function calculateRunningBalanceForChild(
  ctx:
    RunningBalanceCtx,
  childId:
    Id<'children'>,
): Promise<RunningBalance> {
  const child =
    await ctx.db.get(
      childId,
    );

  if (!child) {
    throw new ConvexError(
      'Child not found.',
    );
  }

  const entries =
    await ctx.db
      .query(
        'ledgerEntries',
      )
      .withIndex(
        'by_child_created_at',
        (q) =>
          q.eq(
            'childId',
            childId,
          ),
      )
      .collect();

  let earningTotalSek = 0;
  let penaltyTotalSek = 0;

  for (
    const entry of
    entries
  ) {
    if (
      entry.householdId !==
      child.householdId
    ) {
      throw new ConvexError(
        'Ledger Entry Household does not match its Child.',
      );
    }

    requireSafeWholeSek(
      entry.amountSek,
      'Ledger Entry amount must be whole SEK.',
    );

    if (
      entry.kind ===
      'earning'
    ) {
      if (
        entry.amountSek <=
        0
      ) {
        throw new ConvexError(
          'Earning Ledger Entry must be positive.',
        );
      }

      earningTotalSek +=
        entry.amountSek;

      requireSafeWholeSek(
        earningTotalSek,
        'Running earning total exceeds the supported whole-SEK range.',
      );

      continue;
    }

    if (
      entry.kind ===
      'penalty'
    ) {
      if (
        entry.amountSek >=
        0
      ) {
        throw new ConvexError(
          'Penalty Ledger Entry must be negative.',
        );
      }

      penaltyTotalSek +=
        entry.amountSek;

      requireSafeWholeSek(
        penaltyTotalSek,
        'Running penalty total exceeds the supported whole-SEK range.',
      );

      continue;
    }

    throw new ConvexError(
      'Unsupported Ledger Entry kind.',
    );
  }

  /*
   * A paid Payout is the durable
   * settlement record.
   *
   * Pending Payouts remain part of the
   * Child's Running Balance until the
   * Parent confirms the Swish payment.
   */
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

  let settledTotalSek = 0;

  for (
    const payout of
    payouts
  ) {
    if (
      payout.householdId !==
      child.householdId
    ) {
      throw new ConvexError(
        'Payout Household does not match its Child.',
      );
    }

    if (
      payout.status !==
      'paid'
    ) {
      continue;
    }

    if (
      !Number.isSafeInteger(
        payout.amountDueSek,
      ) ||
      payout.amountDueSek <=
        0
    ) {
      throw new ConvexError(
        'Paid Payout amount must be positive whole SEK.',
      );
    }

    settledTotalSek +=
      payout.amountDueSek;

    requireSafeWholeSek(
      settledTotalSek,
      'Settled payout total exceeds the supported whole-SEK range.',
    );
  }

  const balanceSek =
    earningTotalSek +
    penaltyTotalSek -
    settledTotalSek;

  requireSafeWholeSek(
    balanceSek,
    'Running Balance exceeds the supported whole-SEK range.',
  );

  return {
    childId:
      child._id,

    householdId:
      child.householdId,

    earningTotalSek,

    penaltyTotalSek,

    settledTotalSek,

    balanceSek,

    entryCount:
      entries.length,
  };
}
