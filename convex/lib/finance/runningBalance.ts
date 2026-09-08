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

  balanceSek:
    number;

  entryCount:
    number;
};

/*
 * TASK-14 Running Balance.
 *
 * The Ledger is authoritative.
 *
 * No mutable balance field is stored.
 * Every calculation derives the current
 * balance from durable Ledger Entries for
 * exactly one Child.
 *
 * Until TASK-15 introduces settlement,
 * every existing Ledger Entry is
 * unsettled, so the current Running
 * Balance is their complete sum.
 */
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

  let earningTotalSek =
    0;

  let penaltyTotalSek =
    0;

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

    if (
      !Number.isSafeInteger(
        entry.amountSek,
      )
    ) {
      throw new ConvexError(
        'Ledger Entry amount must be whole SEK.',
      );
    }

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

      if (
        !Number.isSafeInteger(
          earningTotalSek,
        )
      ) {
        throw new ConvexError(
          'Running earning total exceeds the supported whole-SEK range.',
        );
      }

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

      if (
        !Number.isSafeInteger(
          penaltyTotalSek,
        )
      ) {
        throw new ConvexError(
          'Running penalty total exceeds the supported whole-SEK range.',
        );
      }

      continue;
    }

    /*
     * Defensive runtime guard.
     *
     * Current schema permits only earning
     * and penalty, so normal typed code
     * cannot reach this branch.
     */
    throw new ConvexError(
      'Unsupported Ledger Entry kind.',
    );
  }

  const balanceSek =
    earningTotalSek +
    penaltyTotalSek;

  if (
    !Number.isSafeInteger(
      balanceSek,
    )
  ) {
    throw new ConvexError(
      'Running Balance exceeds the supported whole-SEK range.',
    );
  }

  return {
    childId:
      child._id,

    householdId:
      child.householdId,

    earningTotalSek,

    penaltyTotalSek,

    balanceSek,

    entryCount:
      entries.length,
  };
}
