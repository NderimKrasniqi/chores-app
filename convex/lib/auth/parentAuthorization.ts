import { ConvexError } from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';
import { authComponent } from '../../auth';

export async function requireCurrentParentForHousehold(
  ctx:
    | MutationCtx
    | QueryCtx,
  householdId:
    Id<'households'>,
) {
  const authUser =
    await authComponent.safeGetAuthUser(
      ctx,
    );

  if (!authUser) {
    throw new ConvexError(
      'Parent authentication required.',
    );
  }

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
              authUser._id,
            ),
      )
      .unique();

  if (
    !membership ||
    membership.role !==
      'parent'
  ) {
    throw new ConvexError(
      'You are not authorized to review chores for this household.',
    );
  }

  return {
    authUser,
    membership,
  };
}
