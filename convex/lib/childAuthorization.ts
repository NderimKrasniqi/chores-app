import { ConvexError } from 'convex/values';

import type {
  MutationCtx,
  QueryCtx,
} from '../_generated/server';
import { authComponent } from '../auth';

function isAnonymousAuthUser(
  user: object,
) {
  return (
    'isAnonymous' in user &&
    user.isAnonymous === true
  );
}

/*
 * Server-authoritative Child identity resolution.
 *
 * Better Auth proves the current anonymous device identity.
 * Convex proves that identity still owns exactly one active
 * Child-device access grant.
 */
export async function requireCurrentChildAccess(
  ctx:
    | MutationCtx
    | QueryCtx,
) {
  const authUser =
    await authComponent.safeGetAuthUser(
      ctx,
    );

  if (!authUser) {
    throw new ConvexError(
      'Child authentication required.',
    );
  }

  if (
    !isAnonymousAuthUser(
      authUser,
    )
  ) {
    throw new ConvexError(
      'Child authentication required.',
    );
  }

  const grants =
    await ctx.db
      .query(
        'childDeviceAccessGrants',
      )
      .withIndex(
        'by_auth_user',
        (q) =>
          q.eq(
            'authUserId',
            authUser._id,
          ),
      )
      .collect();

  const activeGrants =
    grants.filter(
      (grant) =>
        grant.revokedAt ===
        undefined,
    );

  if (
    activeGrants.length === 0
  ) {
    throw new ConvexError(
      'Child device access has been revoked or is unavailable.',
    );
  }

  if (
    activeGrants.length > 1
  ) {
    throw new ConvexError(
      'Child device identity has multiple active access grants.',
    );
  }

  const grant =
    activeGrants[0];

  const child =
    await ctx.db.get(
      grant.childId,
    );

  if (!child) {
    throw new ConvexError(
      'Child profile no longer exists.',
    );
  }

  if (
    child.householdId !==
    grant.householdId
  ) {
    throw new ConvexError(
      'Invalid Child device access grant.',
    );
  }

  const household =
    await ctx.db.get(
      grant.householdId,
    );

  if (!household) {
    throw new ConvexError(
      'Household no longer exists.',
    );
  }

  return {
    authUserId:
      authUser._id,

    accessGrant:
      grant,

    child,

    household,
  };
}
