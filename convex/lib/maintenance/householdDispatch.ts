import {
  ConvexError,
} from 'convex/values';

import type {
  MutationCtx,
} from '../../_generated/server';

export const
  householdMaintenanceBatchSize =
    10;

function requireBatchSize(
  batchSize:
    number,
) {
  if (
    !Number.isSafeInteger(
      batchSize,
    ) ||
    batchSize < 1 ||
    batchSize > 50
  ) {
    throw new ConvexError(
      'Maintenance batch size must be a whole number from 1 through 50.',
    );
  }
}

export async function getNextHouseholdMaintenanceBatch(
  ctx:
    MutationCtx,
  key:
    string,
  options: {
    batchSize?:
      number;

    now?:
      number;
  } = {},
) {
  if (
    key.trim().length ===
    0
  ) {
    throw new ConvexError(
      'Maintenance dispatch key cannot be empty.',
    );
  }

  const batchSize =
    options.batchSize ??
    householdMaintenanceBatchSize;

  requireBatchSize(
    batchSize,
  );

  const now =
    options.now ??
    Date.now();

  if (
    !Number.isFinite(
      now,
    )
  ) {
    throw new ConvexError(
      'Maintenance dispatch time must be finite.',
    );
  }

  const state =
    await ctx.db
      .query(
        'maintenanceDispatchState',
      )
      .withIndex(
        'by_key',
        (q) =>
          q.eq(
            'key',
            key,
          ),
      )
      .unique();

  const page =
    await ctx.db
      .query(
        'households',
      )
      .order(
        'asc',
      )
      .paginate({
        numItems:
          batchSize,

        cursor:
          state?.cursor ??
          null,
      });

  const nextCursor =
    page.isDone
      ? null
      : page.continueCursor;

  if (state) {
    await ctx.db.patch(
      state._id,
      {
        cursor:
          nextCursor,

        updatedAt:
          now,
      },
    );
  } else {
    await ctx.db.insert(
      'maintenanceDispatchState',
      {
        key,

        cursor:
          nextCursor,

        updatedAt:
          now,
      },
    );
  }

  return {
    householdIds:
      page.page.map(
        (household) =>
          household._id,
      ),

    completedCycle:
      page.isDone,
  };
}
