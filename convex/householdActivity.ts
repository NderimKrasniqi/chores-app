import {
  ConvexError,
  v,
} from 'convex/values';

import {
  query,
} from './_generated/server';
import {
  requireCurrentChildAccess,
} from './lib/auth/childAuthorization';
import {
  requireCurrentParentForHousehold,
} from './lib/auth/parentAuthorization';
import {
  listHouseholdApprovalActivity,
} from './lib/activity/approvalActivity';

const activityItemValidator =
  v.object({
    activityId:
      v.id(
        'choreReviews',
      ),

    childId:
      v.id(
        'children',
      ),

    childDisplayName:
      v.string(),

    choreTitle:
      v.string(),

    choreKind:
      v.union(
        v.literal(
          'personal',
        ),
        v.literal(
          'claimable',
        ),
      ),

    valueSek:
      v.number(),

    approvedAt:
      v.number(),
  });

const activityFeedValidator =
  v.object({
    timezone:
      v.string(),

    items:
      v.array(
        activityItemValidator,
      ),
  });

/*
 * Child-facing shared social surface.
 *
 * No Child ID is accepted from the client.
 * Authentication determines the Household.
 *
 * Individual approved chore values are shared
 * by product design, but sibling balances and
 * detailed Ledger history are not returned.
 */
export const listForCurrentChild =
  query({
    args: {},

    returns:
      activityFeedValidator,

    handler: async (
      ctx,
    ) => {
      const {
        household,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      return {
        timezone:
          household.timezone,

        items:
          await listHouseholdApprovalActivity(
            ctx,
            household._id,
          ),
      };
    },
  });

export const listForParent =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    returns:
      activityFeedValidator,

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      const household =
        await ctx.db.get(
          args.householdId,
        );

      if (!household) {
        throw new ConvexError(
          'Household not found.',
        );
      }

      return {
        timezone:
          household.timezone,

        items:
          await listHouseholdApprovalActivity(
            ctx,
            household._id,
          ),
      };
    },
  });
