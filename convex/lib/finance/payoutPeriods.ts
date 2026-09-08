import {
  ConvexError,
} from 'convex/values';

import {
  internal,
} from '../../_generated/api';
import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';
import {
  getCurrentPayoutWeekWindow,
} from '../claims/commitmentRules';
import {
  addLocalDays,
  getWeekday,
  resolveLocalDateTimeToEpochMs,
  type Weekday,
} from '../scheduling/choreScheduling';
import {
  getLocalDateForInstant,
} from '../scheduling/householdTime';
import {
  createPayoutOutcomesForPeriod,
} from './payoutSettlement';

type DatabaseCtx =
  | MutationCtx
  | QueryCtx;

type PeriodOptions = {
  scheduleTransitions?:
    boolean;
};

function requireFiniteTimestamp(
  value: number,
  name: string,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new ConvexError(
      `${name} must be finite.`,
    );
  }
}

export async function findPayoutPeriodContainingInstant(
  ctx: DatabaseCtx,
  householdId:
    Id<'households'>,
  now: number,
) {
  requireFiniteTimestamp(
    now,
    'now',
  );

  const candidate =
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
              householdId,
            )
            .lte(
              'startAt',
              now,
            ),
      )
      .order(
        'desc',
      )
      .first();

  if (
    candidate &&
    now >=
      candidate.startAt &&
    now <
      candidate.endAt
  ) {
    return candidate;
  }

  return null;
}

function getNextPayoutPeriodWindow({
  startAt,
  timezone,
  payoutWeekday,
}: {
  startAt:
    number;

  timezone:
    string;

  payoutWeekday:
    Weekday;
}) {
  requireFiniteTimestamp(
    startAt,
    'startAt',
  );

  const startLocalDate =
    getLocalDateForInstant(
      startAt,
      timezone,
    );

  for (
    let offset = 0;
    offset <= 7;
    offset += 1
  ) {
    const candidateLocalDate =
      addLocalDays(
        startLocalDate,
        offset,
      );

    if (
      getWeekday(
        candidateLocalDate,
      ) !==
      payoutWeekday
    ) {
      continue;
    }

    const candidateAt =
      resolveLocalDateTimeToEpochMs(
        candidateLocalDate,
        '00:00',
        timezone,
      );

    /*
     * The next period must never overlap
     * the period that just closed.
     */
    if (
      candidateAt <=
      startAt
    ) {
      continue;
    }

    return {
      startLocalDate,

      endLocalDate:
        candidateLocalDate,

      startAt,

      endAt:
        candidateAt,

      timezone,

      payoutWeekday,
    };
  }

  throw new ConvexError(
    'Could not resolve next Payout Period boundary.',
  );
}

async function insertPayoutPeriod(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  window: {
    startLocalDate:
      string;

    endLocalDate:
      string;

    startAt:
      number;

    endAt:
      number;

    timezone:
      string;

    payoutWeekday:
      Weekday;
  },
  now: number,
  options:
    PeriodOptions,
) {
  const existing =
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
              householdId,
            )
            .eq(
              'startAt',
              window.startAt,
            ),
      )
      .unique();

  if (existing) {
    return existing;
  }

  const payoutPeriodId =
    await ctx.db.insert(
      'payoutPeriods',
      {
        householdId,

        startLocalDate:
          window.startLocalDate,

        endLocalDate:
          window.endLocalDate,

        startAt:
          window.startAt,

        endAt:
          window.endAt,

        timezone:
          window.timezone,

        payoutWeekday:
          window.payoutWeekday,

        state:
          'open',

        createdAt:
          now,
      },
    );

  if (
    (
      options
        .scheduleTransitions ??
      true
    ) &&
    window.endAt >
      now
  ) {
    await ctx.scheduler.runAt(
      window.endAt,

      internal
        .jobs.payouts.transitions
        .reconcile,

      {
        payoutPeriodId,
      },
    );
  }

  const period =
    await ctx.db.get(
      payoutPeriodId,
    );

  if (!period) {
    throw new ConvexError(
      'Created Payout Period could not be loaded.',
    );
  }

  return period;
}

async function createInitialPayoutPeriod(
  ctx: MutationCtx,
  household:
    Doc<'households'>,
  now: number,
  options:
    PeriodOptions,
) {
  const window =
    getCurrentPayoutWeekWindow({
      now,

      timezone:
        household.timezone,

      payoutWeekday:
        household
          .payoutWeekday,
    });

  return await insertPayoutPeriod(
    ctx,
    household._id,
    window,
    now,
    options,
  );
}

async function createNextPayoutPeriod(
  ctx: MutationCtx,
  household:
    Doc<'households'>,
  previousEndAt:
    number,
  now: number,
  options:
    PeriodOptions,
) {
  const window =
    getNextPayoutPeriodWindow({
      startAt:
        previousEndAt,

      timezone:
        household.timezone,

      payoutWeekday:
        household
          .payoutWeekday,
    });

  return await insertPayoutPeriod(
    ctx,
    household._id,
    window,
    now,
    options,
  );
}

export async function closePayoutPeriod(
  ctx: MutationCtx,
  payoutPeriodId:
    Id<'payoutPeriods'>,
  now = Date.now(),
  options:
    PeriodOptions = {},
) {
  requireFiniteTimestamp(
    now,
    'now',
  );

  const period =
    await ctx.db.get(
      payoutPeriodId,
    );

  if (!period) {
    throw new ConvexError(
      'Payout Period not found.',
    );
  }

  const household =
    await ctx.db.get(
      period.householdId,
    );

  if (!household) {
    throw new ConvexError(
      'Household not found.',
    );
  }

  if (
    period.state ===
    'open'
  ) {
    if (
      now <
      period.endAt
    ) {
      return {
        status:
          'not_due' as const,

        payoutPeriodId:
          period._id,

        nextPayoutPeriodId:
          null,
      };
    }

    await createPayoutOutcomesForPeriod(
      ctx,
      period,
      now,
    );

    await ctx.db.patch(
      period._id,
      {
        state:
          'closed',

        closedAt:
          now,
      },
    );
  }

  const nextPeriod =
    await createNextPayoutPeriod(
      ctx,
      household,
      period.endAt,
      now,
      options,
    );

  return {
    status:
      'closed' as const,

    payoutPeriodId:
      period._id,

    nextPayoutPeriodId:
      nextPeriod._id,
  };
}

export async function ensureCurrentPayoutPeriod(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  now = Date.now(),
  options:
    PeriodOptions = {},
) {
  requireFiniteTimestamp(
    now,
    'now',
  );

  const household =
    await ctx.db.get(
      householdId,
    );

  if (!household) {
    throw new ConvexError(
      'Household not found.',
    );
  }

  const containing =
    await findPayoutPeriodContainingInstant(
      ctx,
      householdId,
      now,
    );

  if (
    containing &&
    containing.state ===
      'open'
  ) {
    return containing;
  }

  let latest =
    await ctx.db
      .query(
        'payoutPeriods',
      )
      .withIndex(
        'by_household_start_at',
        (q) =>
          q.eq(
            'householdId',
            householdId,
          ),
      )
      .order(
        'desc',
      )
      .first();

  if (!latest) {
    latest =
      await createInitialPayoutPeriod(
        ctx,
        household,
        now,
        options,
      );

    return latest;
  }

  /*
   * Safety bound for stale development
   * databases. Normal production use
   * advances one period at a time.
   */
  for (
    let iteration = 0;
    iteration < 64;
    iteration += 1
  ) {
    if (
      latest.state ===
        'open' &&
      now >=
        latest.startAt &&
      now <
        latest.endAt
    ) {
      return latest;
    }

    if (
      latest.state ===
        'open' &&
      now >=
        latest.endAt
    ) {
      const result =
        await closePayoutPeriod(
          ctx,
          latest._id,
          now,
          options,
        );

      if (
        !result
          .nextPayoutPeriodId
      ) {
        throw new ConvexError(
          'Payout Period rollover did not create a next period.',
        );
      }

      const next =
        await ctx.db.get(
          result
            .nextPayoutPeriodId,
        );

      if (!next) {
        throw new ConvexError(
          'Next Payout Period not found.',
        );
      }

      latest =
        next;

      continue;
    }

    if (
      latest.state ===
        'closed'
    ) {
      latest =
        await createNextPayoutPeriod(
          ctx,
          household,
          latest.endAt,
          now,
          options,
        );

      continue;
    }

    throw new ConvexError(
      'Unable to resolve current Payout Period.',
    );
  }

  throw new ConvexError(
    'Payout Period catch-up exceeded safety limit.',
  );
}

/*
 * Query-safe projection used by weekly
 * unclaim accounting and Parent UI.
 *
 * Existing Households created before
 * TASK-15 may briefly use the deterministic
 * legacy window until maintenance persists
 * their first durable period.
 */
export async function getPayoutWindowForUsage(
  ctx: DatabaseCtx,
  household:
    Doc<'households'>,
  now = Date.now(),
) {
  const durable =
    await findPayoutPeriodContainingInstant(
      ctx,
      household._id,
      now,
    );

  if (durable) {
    return {
      payoutPeriodId:
        durable._id,

      startLocalDate:
        durable
          .startLocalDate,

      endLocalDate:
        durable
          .endLocalDate,

      startAt:
        durable.startAt,

      endAt:
        durable.endAt,

      timezone:
        durable.timezone,

      payoutWeekday:
        durable
          .payoutWeekday,
    };
  }

  const fallback =
    getCurrentPayoutWeekWindow({
      now,

      timezone:
        household.timezone,

      payoutWeekday:
        household
          .payoutWeekday,
    });

  return {
    payoutPeriodId:
      null,

    ...fallback,
  };
}

export async function maintainPayoutPeriods(
  ctx: MutationCtx,
  now = Date.now(),
) {
  const households =
    await ctx.db
      .query(
        'households',
      )
      .collect();

  let maintainedCount = 0;

  for (
    const household of
    households
  ) {
    await ensureCurrentPayoutPeriod(
      ctx,
      household._id,
      now,
    );

    maintainedCount +=
      1;
  }

  return {
    maintainedCount,
  };
}
