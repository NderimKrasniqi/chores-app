import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';

type DatabaseCtx =
  | MutationCtx
  | QueryCtx;

/*
 * Revoked grants remain durable history.
 *
 * Operational authorization only needs
 * active grants, so query that subset
 * directly and read at most two rows.
 *
 * Two rows are sufficient to preserve
 * the fail-closed uniqueness invariant.
 */
export async function listActiveChildAccessGrantsForAuthUser(
  ctx:
    DatabaseCtx,
  authUserId:
    string,
) {
  return await ctx.db
    .query(
      'childDeviceAccessGrants',
    )
    .withIndex(
      'by_auth_user_revoked_at',
      (q) =>
        q
          .eq(
            'authUserId',
            authUserId,
          )
          .eq(
            'revokedAt',
            undefined,
          ),
    )
    .take(
      2,
    );
}

export async function getUniqueActiveChildAccessGrantForAuthUser(
  ctx:
    DatabaseCtx,
  authUserId:
    string,
) {
  const activeGrants =
    await listActiveChildAccessGrantsForAuthUser(
      ctx,
      authUserId,
    );

  if (
    activeGrants.length >
    1
  ) {
    throw new ConvexError(
      'Child device identity has multiple active access grants.',
    );
  }

  return (
    activeGrants[0] ??
    null
  );
}

export async function findActiveChildAccessGrantForCredential(
  ctx:
    DatabaseCtx,
  authUserId:
    string,
  pairingCredentialId:
    Id<'childPairingCredentials'>,
) {
  const activeGrant =
    await getUniqueActiveChildAccessGrantForAuthUser(
      ctx,
      authUserId,
    );

  if (
    !activeGrant ||
    activeGrant
      .pairingCredentialId !==
      pairingCredentialId
  ) {
    return null;
  }

  return activeGrant;
}
