import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import {
  requireCurrentParentAuthUser,
  requireCurrentParentForHousehold,
} from './lib/auth/parentAuthorization';
import { ensureCurrentPayoutPeriod } from './lib/finance/payoutPeriods';

const payoutWeekdayValidator = v.union(
  v.literal('monday'),
  v.literal('tuesday'),
  v.literal('wednesday'),
  v.literal('thursday'),
  v.literal('friday'),
  v.literal('saturday'),
  v.literal('sunday'),
);

function normalizeTimezone(timezone: string) {
  const trimmed = timezone.trim();

  if (!trimmed) {
    throw new ConvexError('Timezone is required.');
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: trimmed,
    }).resolvedOptions().timeZone;
  } catch {
    throw new ConvexError('Invalid IANA timezone.');
  }
}

export const create = mutation({
  args: {
    name: v.string(),
    timezone: v.string(),
    payoutWeekday: payoutWeekdayValidator,
    weeklyUnclaimAllowance: v.number(),
    children: v.array(
      v.object({
        displayName: v.string(),
      }),
    ),
  },

  returns: v.object({
    householdId: v.id('households'),
    membershipId: v.id('householdMembers'),
    childIds: v.array(v.id('children')),
  }),

  handler: async (ctx, args) => {
    const authUser =
      await requireCurrentParentAuthUser(
        ctx,
      );

    const householdName = args.name.trim();

    if (!householdName) {
      throw new ConvexError('Household name is required.');
    }

    if (
      !Number.isSafeInteger(args.weeklyUnclaimAllowance) ||
      args.weeklyUnclaimAllowance < 0
    ) {
      throw new ConvexError(
        'Weekly unclaim allowance must be a non-negative whole number.',
      );
    }

    const children = args.children.map((child) => {
      const displayName = child.displayName.trim();

      if (!displayName) {
        throw new ConvexError('Child name cannot be empty.');
      }

      return {
        displayName,
      };
    });

    const timezone = normalizeTimezone(args.timezone);
    const now = Date.now();

    const householdId = await ctx.db.insert('households', {
      name: householdName,
      timezone,
      payoutWeekday: args.payoutWeekday,
      weeklyUnclaimAllowance: args.weeklyUnclaimAllowance,
      createdAt: now,
      updatedAt: now,
    });

    const membershipId = await ctx.db.insert('householdMembers', {
      householdId,
      authUserId: authUser._id,
      role: 'parent',
      joinedAt: now,
    });

    const childIds: Id<'children'>[] = [];

    for (const child of children) {
      const childId = await ctx.db.insert('children', {
        householdId,
        displayName: child.displayName,
        createdAt: now,
        updatedAt: now,
      });

      childIds.push(childId);
    }

    await ensureCurrentPayoutPeriod(
      ctx,
      householdId,
      now,
    );

    return {
      householdId,
      membershipId,
      childIds,
    };
  },
});

export const listForCurrentParent = query({
  args: {},

  returns: v.array(
    v.object({
      householdId: v.id('households'),
      name: v.string(),
      timezone: v.string(),
      payoutWeekday: payoutWeekdayValidator,
      weeklyUnclaimAllowance: v.number(),
      children: v.array(
        v.object({
          childId: v.id('children'),
          displayName: v.string(),
        }),
      ),
    }),
  ),

  handler: async (ctx) => {
    const authUser =
      await requireCurrentParentAuthUser(
        ctx,
      );

    const memberships = await ctx.db
      .query('householdMembers')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authUser._id))
      .collect();

    const result = [];

    for (const membership of memberships) {
      const household = await ctx.db.get(membership.householdId);

      if (!household) {
        continue;
      }

      const children = await ctx.db
        .query('children')
        .withIndex('by_household', (q) => q.eq('householdId', household._id))
        .collect();

      result.push({
        householdId: household._id,
        name: household.name,
        timezone: household.timezone,
        payoutWeekday: household.payoutWeekday,
        weeklyUnclaimAllowance: household.weeklyUnclaimAllowance,
        children: children.map((child) => ({
          childId: child._id,
          displayName: child.displayName,
        })),
      });
    }

    return result;
  },
});


export const setPayoutWeekday =
  mutation({
    args: {
      householdId:
        v.id('households'),

      payoutWeekday:
        payoutWeekdayValidator,
    },

    returns:
      v.object({
        householdId:
          v.id('households'),

        payoutWeekday:
          payoutWeekdayValidator,

        currentPeriodEndAt:
          v.number(),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      const now =
        Date.now();

      /*
       * Persist the current period before
       * changing the Household setting.
       *
       * Its existing end boundary is now
       * immutable. The new weekday is used
       * only when the next period is opened.
       */
      const currentPeriod =
        await ensureCurrentPayoutPeriod(
          ctx,
          args.householdId,
          now,
        );

      await ctx.db.patch(
        args.householdId,
        {
          payoutWeekday:
            args.payoutWeekday,

          updatedAt:
            now,
        },
      );

      return {
        householdId:
          args.householdId,

        payoutWeekday:
          args.payoutWeekday,

        currentPeriodEndAt:
          currentPeriod.endAt,
      };
    },
  });
