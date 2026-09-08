import type {
  GenericCtx,
} from '@convex-dev/better-auth';
import {
  ConvexError,
} from 'convex/values';

import type {
  DataModel,
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';
import {
  authComponent,
} from '../../auth';

export function isAnonymousAuthUser(
  user: object,
) {
  return (
    'isAnonymous' in user &&
    user.isAnonymous === true
  );
}

export function requireParentCapableAuthUser<
  AuthUser extends object,
>(
  authUser:
    | AuthUser
    | null
    | undefined,
): AuthUser {
  if (
    !authUser ||
    isAnonymousAuthUser(
      authUser,
    )
  ) {
    throw new ConvexError(
      'Parent authentication required.',
    );
  }

  return authUser;
}

export async function requireCurrentParentAuthUser(
  ctx:
    GenericCtx<DataModel>,
) {
  const authUser =
    await authComponent.safeGetAuthUser(
      ctx,
    );

  return requireParentCapableAuthUser(
    authUser,
  );
}

export async function requireCurrentParentForHousehold(
  ctx:
    | MutationCtx
    | QueryCtx,
  householdId:
    Id<'households'>,
) {
  const authUser =
    await requireCurrentParentAuthUser(
      ctx,
    );

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
