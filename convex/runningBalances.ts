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
  calculateRunningBalanceForChild,
} from './lib/finance/runningBalance';

const runningBalanceResultValidator =
  v.object({
    childId:
      v.id('children'),

    balanceSek:
      v.number(),
  });

/*
 * Child-facing financial projection.
 *
 * The caller supplies no Child ID.
 * Current Child identity is resolved
 * entirely from authenticated server
 * state, preventing sibling-balance
 * lookups.
 */
export const getMine =
  query({
    args: {},

    returns:
      runningBalanceResultValidator,

    handler: async (
      ctx,
    ) => {
      const {
        child,
        household,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      const balance =
        await calculateRunningBalanceForChild(
          ctx,
          child._id,
        );

      /*
       * Defensive consistency check.
       * Authentication grant, Child, and
       * financial Ledger must all resolve
       * to the same Household.
       */
      if (
        balance.householdId !==
        household._id
      ) {
        throw new ConvexError(
          'Running Balance Household does not match current Child access.',
        );
      }

      return {
        childId:
          child._id,

        balanceSek:
          balance.balanceSek,
      };
    },
  });

/*
 * Parent-facing financial projection.
 *
 * Parent authorization is scoped to the
 * requested Household first.
 *
 * A Child from another Household cannot
 * be queried even when its ID is known.
 */
export const getForChild =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),

      childId:
        v.id(
          'children',
        ),
    },

    returns:
      runningBalanceResultValidator,

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      const child =
        await ctx.db.get(
          args.childId,
        );

      if (!child) {
        throw new ConvexError(
          'Child not found.',
        );
      }

      if (
        child.householdId !==
        args.householdId
      ) {
        throw new ConvexError(
          'This Child does not belong to this Household.',
        );
      }

      const balance =
        await calculateRunningBalanceForChild(
          ctx,
          child._id,
        );

      if (
        balance.householdId !==
        args.householdId
      ) {
        throw new ConvexError(
          'Running Balance Household does not match the requested Household.',
        );
      }

      return {
        childId:
          child._id,

        balanceSek:
          balance.balanceSek,
      };
    },
  });
