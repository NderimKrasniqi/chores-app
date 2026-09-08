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

export async function findParentMembershipForHousehold(
  ctx:
    | MutationCtx
    | QueryCtx,
  householdId:
    Id<'households'>,
  authUserId:
    string,
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
    return null;
  }

  return membership;
}

export async function requireParentMembershipForHousehold(
  ctx:
    | MutationCtx
    | QueryCtx,
  householdId:
    Id<'households'>,
  authUserId:
    string,
  message =
    'You are not authorized as a Parent for this Household.',
) {
  const membership =
    await findParentMembershipForHousehold(
      ctx,
      householdId,
      authUserId,
    );

  if (!membership) {
    throw new ConvexError(
      message,
    );
  }

  return membership;
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
    await requireParentMembershipForHousehold(
      ctx,
      householdId,
      authUser._id,
    );

  return {
    authUser,
    membership,
  };
}
