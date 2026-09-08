import {
  ConvexError,
} from 'convex/values';

import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';

type FinancialReadCtx =
  | MutationCtx
  | QueryCtx;

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

type LedgerEntryInput = {
  householdId:
    Id<'households'>;

  childId:
    Id<'children'>;

  occurrenceId:
    Id<'choreOccurrences'>;

  reviewId?:
    Id<'choreReviews'>;

  kind:
    'earning' |
    'penalty';

  amountSek:
    number;

  createdAt:
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

function validateLedgerAmount(
  kind:
    LedgerEntryInput['kind'],
  amountSek:
    number,
) {
  requireSafeWholeSek(
    amountSek,
    'Ledger Entry amount must be whole SEK.',
  );

  if (
    kind ===
      'earning' &&
    amountSek <=
      0
  ) {
    throw new ConvexError(
      'Earning Ledger Entry must be positive.',
    );
  }

  if (
    kind ===
      'penalty' &&
    amountSek >=
      0
  ) {
    throw new ConvexError(
      'Penalty Ledger Entry must be negative.',
    );
  }
}

async function findProjection(
  ctx:
    FinancialReadCtx,
  childId:
    Id<'children'>,
) {
  return await ctx.db
    .query(
      'childFinancialBalances',
    )
    .withIndex(
      'by_child',
      (q) =>
        q.eq(
          'childId',
          childId,
        ),
    )
    .unique();
}

function projectionToRunningBalance(
  child:
    Doc<'children'>,
  projection:
    Doc<'childFinancialBalances'>,
): RunningBalance {
  if (
    projection.householdId !==
      child.householdId
  ) {
    throw new ConvexError(
      'Financial projection Household does not match its Child.',
    );
  }

  requireSafeWholeSek(
    projection.earningTotalSek,
    'Projected earning total exceeds the supported whole-SEK range.',
  );

  requireSafeWholeSek(
    projection.penaltyTotalSek,
    'Projected penalty total exceeds the supported whole-SEK range.',
  );

  requireSafeWholeSek(
    projection.settledTotalSek,
    'Projected settlement total exceeds the supported whole-SEK range.',
  );

  if (
    !Number.isSafeInteger(
      projection.entryCount,
    ) ||
    projection.entryCount <
      0
  ) {
    throw new ConvexError(
      'Projected Ledger Entry count is invalid.',
    );
  }

  const balanceSek =
    projection.earningTotalSek +
    projection.penaltyTotalSek -
    projection.settledTotalSek;

  requireSafeWholeSek(
    balanceSek,
    'Running Balance exceeds the supported whole-SEK range.',
  );

  return {
    childId:
      child._id,

    householdId:
      child.householdId,

    earningTotalSek:
      projection.earningTotalSek,

    penaltyTotalSek:
      projection.penaltyTotalSek,

    settledTotalSek:
      projection.settledTotalSek,

    balanceSek,

    entryCount:
      projection.entryCount,
  };
}

/*
 * Compatibility/bootstrap path.
 *
 * Existing deployments may contain
 * financial history created before the
 * projection table existed.
 *
 * This lifetime scan is intentionally
 * retained only for:
 *
 * - a missing projection;
 * - migration/rebuild;
 * - corruption recovery.
 *
 * Normal post-migration reads use the
 * single projection document.
 */
async function scanFinancialHistoryForChild(
  ctx:
    FinancialReadCtx,
  child:
    Doc<'children'>,
): Promise<RunningBalance> {
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
            child._id,
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

    validateLedgerAmount(
      entry.kind,
      entry.amountSek,
    );

    if (
      entry.kind ===
      'earning'
    ) {
      earningTotalSek +=
        entry.amountSek;

      requireSafeWholeSek(
        earningTotalSek,
        'Running earning total exceeds the supported whole-SEK range.',
      );
    } else {
      penaltyTotalSek +=
        entry.amountSek;

      requireSafeWholeSek(
        penaltyTotalSek,
        'Running penalty total exceeds the supported whole-SEK range.',
      );
    }
  }

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
            child._id,
          ),
      )
      .collect();

  let settledTotalSek =
    0;

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

    requireSafeWholeSek(
      payout.amountDueSek,
      'Paid Payout amount must be whole SEK.',
    );

    if (
      payout.amountDueSek <=
      0
    ) {
      throw new ConvexError(
        'Paid Payout amount must be positive.',
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

export async function calculateRunningBalanceForChild(
  ctx:
    FinancialReadCtx,
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

  const projection =
    await findProjection(
      ctx,
      childId,
    );

  if (projection) {
    return projectionToRunningBalance(
      child,
      projection,
    );
  }

  return await scanFinancialHistoryForChild(
    ctx,
    child,
  );
}

export async function ensureFinancialBalanceProjection(
  ctx:
    MutationCtx,
  childId:
    Id<'children'>,
  updatedAt =
    Date.now(),
) {
  const child =
    await ctx.db.get(
      childId,
    );

  if (!child) {
    throw new ConvexError(
      'Child not found.',
    );
  }

  const existing =
    await findProjection(
      ctx,
      childId,
    );

  if (existing) {
    if (
      existing.householdId !==
      child.householdId
    ) {
      throw new ConvexError(
        'Financial projection Household does not match its Child.',
      );
    }

    return existing;
  }

  const legacy =
    await scanFinancialHistoryForChild(
      ctx,
      child,
    );

  const projectionId =
    await ctx.db.insert(
      'childFinancialBalances',
      {
        householdId:
          child.householdId,

        childId:
          child._id,

        earningTotalSek:
          legacy.earningTotalSek,

        penaltyTotalSek:
          legacy.penaltyTotalSek,

        settledTotalSek:
          legacy.settledTotalSek,

        entryCount:
          legacy.entryCount,

        updatedAt,
      },
    );

  const projection =
    await ctx.db.get(
      projectionId,
    );

  if (!projection) {
    throw new ConvexError(
      'Financial projection could not be loaded after creation.',
    );
  }

  return projection;
}

export async function rebuildFinancialBalanceProjection(
  ctx:
    MutationCtx,
  childId:
    Id<'children'>,
  updatedAt =
    Date.now(),
) {
  const child =
    await ctx.db.get(
      childId,
    );

  if (!child) {
    throw new ConvexError(
      'Child not found.',
    );
  }

  const rebuilt =
    await scanFinancialHistoryForChild(
      ctx,
      child,
    );

  const existing =
    await findProjection(
      ctx,
      childId,
    );

  const values = {
    householdId:
      child.householdId,

    childId:
      child._id,

    earningTotalSek:
      rebuilt.earningTotalSek,

    penaltyTotalSek:
      rebuilt.penaltyTotalSek,

    settledTotalSek:
      rebuilt.settledTotalSek,

    entryCount:
      rebuilt.entryCount,

    updatedAt,
  };

  if (existing) {
    await ctx.db.patch(
      existing._id,
      values,
    );

    return existing._id;
  }

  return await ctx.db.insert(
    'childFinancialBalances',
    values,
  );
}

export async function insertFinancialLedgerEntry(
  ctx:
    MutationCtx,
  input:
    LedgerEntryInput,
) {
  validateLedgerAmount(
    input.kind,
    input.amountSek,
  );

  const projection =
    await ensureFinancialBalanceProjection(
      ctx,
      input.childId,
      input.createdAt,
    );

  if (
    projection.householdId !==
    input.householdId
  ) {
    throw new ConvexError(
      'Ledger Entry Household does not match the Child financial projection.',
    );
  }

  const earningTotalSek =
    projection.earningTotalSek +
    (
      input.kind ===
        'earning'
        ? input.amountSek
        : 0
    );

  const penaltyTotalSek =
    projection.penaltyTotalSek +
    (
      input.kind ===
        'penalty'
        ? input.amountSek
        : 0
    );

  const entryCount =
    projection.entryCount +
    1;

  requireSafeWholeSek(
    earningTotalSek,
    'Projected earning total exceeds the supported whole-SEK range.',
  );

  requireSafeWholeSek(
    penaltyTotalSek,
    'Projected penalty total exceeds the supported whole-SEK range.',
  );

  if (
    !Number.isSafeInteger(
      entryCount,
    )
  ) {
    throw new ConvexError(
      'Projected Ledger Entry count exceeds the supported range.',
    );
  }

  const ledgerEntryId =
    await ctx.db.insert(
      'ledgerEntries',
      {
        householdId:
          input.householdId,

        childId:
          input.childId,

        occurrenceId:
          input.occurrenceId,

        ...(input.reviewId !==
        undefined
          ? {
              reviewId:
                input.reviewId,
            }
          : {}),

        kind:
          input.kind,

        amountSek:
          input.amountSek,

        createdAt:
          input.createdAt,
      },
    );

  await ctx.db.patch(
    projection._id,
    {
      earningTotalSek,
      penaltyTotalSek,
      entryCount,

      updatedAt:
        input.createdAt,
    },
  );

  return ledgerEntryId;
}

export async function applyPaidPayoutToFinancialBalance(
  ctx:
    MutationCtx,
  input: {
    householdId:
      Id<'households'>;

    childId:
      Id<'children'>;

    amountSek:
      number;

    paidAt:
      number;
  },
) {
  requireSafeWholeSek(
    input.amountSek,
    'Paid Payout amount must be whole SEK.',
  );

  if (
    input.amountSek <=
    0
  ) {
    throw new ConvexError(
      'Paid Payout amount must be positive.',
    );
  }

  const projection =
    await ensureFinancialBalanceProjection(
      ctx,
      input.childId,
      input.paidAt,
    );

  if (
    projection.householdId !==
    input.householdId
  ) {
    throw new ConvexError(
      'Payout Household does not match the Child financial projection.',
    );
  }

  const settledTotalSek =
    projection.settledTotalSek +
    input.amountSek;

  requireSafeWholeSek(
    settledTotalSek,
    'Projected settlement total exceeds the supported whole-SEK range.',
  );

  await ctx.db.patch(
    projection._id,
    {
      settledTotalSek,

      updatedAt:
        input.paidAt,
    },
  );
}
