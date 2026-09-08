import {
  ConvexError,
  v,
} from 'convex/values';

import type { Id } from './_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from './_generated/server';
import {
  mutation,
  query,
} from './_generated/server';
import { authComponent } from './auth';
import { generateOccurrencesForWindow } from './lib/occurrences/generation';

async function requireParentForHousehold(
  ctx:
    | MutationCtx
    | QueryCtx,
  householdId:
    Id<'households'>,
  authUserId: string,
) {
  const membership =
    await ctx.db
      .query(
        'householdMembers',
      )
      .withIndex(
        'by_household_auth_user',
        (q) =>
          q
            .eq(
              'householdId',
              householdId,
            )
            .eq(
              'authUserId',
              authUserId,
            ),
      )
      .unique();

  if (
    !membership ||
    membership.role !==
      'parent'
  ) {
    throw new ConvexError(
      'You are not authorized to manage chore occurrences for this household.',
    );
  }

  return membership;
}

/*
 * Parent-authorized generation seam.
 *
 * TASK-07 scheduling/reconciliation
 * will later call the same private
 * generation helper without requiring
 * a Parent to press anything.
 */
export const generateForWindow =
  mutation({
    args: {
      householdId:
        v.id(
          'households',
        ),

      fromLocalDate:
        v.string(),

      throughLocalDate:
        v.string(),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const authUser =
        await authComponent.safeGetAuthUser(
          ctx,
        );

      if (!authUser) {
        throw new ConvexError(
          'Authentication required.',
        );
      }

      await requireParentForHousehold(
        ctx,
        args.householdId,
        authUser._id,
      );

      return await generateOccurrencesForWindow(
        ctx,
        args.householdId,
        args.fromLocalDate,
        args.throughLocalDate,
      );
    },
  });

export const listForHousehold =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const authUser =
        await authComponent.safeGetAuthUser(
          ctx,
        );

      if (!authUser) {
        throw new ConvexError(
          'Authentication required.',
        );
      }

      await requireParentForHousehold(
        ctx,
        args.householdId,
        authUser._id,
      );

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
                args.householdId,
              ),
          )
          .collect();

      return occurrences.sort(
        (left, right) =>
          left.availabilityStartsAt -
          right.availabilityStartsAt,
      );
    },
  });
