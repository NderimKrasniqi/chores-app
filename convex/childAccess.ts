import { ConvexError, v } from 'convex/values';

import { query } from './_generated/server';
import { authComponent } from './auth';

function isAnonymousAuthUser(user: object) {
  return 'isAnonymous' in user && user.isAnonymous === true;
}

/**
 * Child-facing authorization seam.
 *
 * Better Auth proves who the current device identity is.
 * Convex proves whether that identity currently has an active grant
 * to a Child profile.
 */
export const getCurrentChildAccess = query({
  args: {},

  returns: v.union(
    v.null(),
    v.object({
      accessGrantId: v.id('childDeviceAccessGrants'),
      householdId: v.id('households'),
      householdName: v.string(),
      childId: v.id('children'),
      childDisplayName: v.string(),
      grantedAt: v.number(),
    }),
  ),

  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      return null;
    }

    if (!isAnonymousAuthUser(authUser)) {
      return null;
    }

    const grants = await ctx.db
      .query('childDeviceAccessGrants')
      .withIndex('by_auth_user', (q) => q.eq('authUserId', authUser._id))
      .collect();

    const activeGrants = grants.filter(
      (grant) => grant.revokedAt === undefined,
    );

    if (activeGrants.length === 0) {
      return null;
    }

    if (activeGrants.length > 1) {
      throw new ConvexError(
        'Child device identity has multiple active access grants.',
      );
    }

    const grant = activeGrants[0];

    const child = await ctx.db.get(grant.childId);

    if (!child) {
      throw new ConvexError('Child profile no longer exists.');
    }

    if (child.householdId !== grant.householdId) {
      throw new ConvexError('Invalid child device access grant.');
    }

    const household = await ctx.db.get(grant.householdId);

    if (!household) {
      throw new ConvexError('Household no longer exists.');
    }

    return {
      accessGrantId: grant._id,
      householdId: household._id,
      householdName: household.name,
      childId: child._id,
      childDisplayName: child.displayName,
      grantedAt: grant.createdAt,
    };
  },
});

/**
 * Parent-facing list of currently usable pairing credentials.
 *
 * Raw QR tokens, manual codes, and their hashes are never returned.
 * The Parent only receives lifecycle metadata and the credential ID
 * required for revocation.
 */
export const listActivePairingCredentialsForChild = query({
  args: {
    childId: v.id('children'),
  },

  returns: v.array(
    v.object({
      pairingCredentialId: v.id('childPairingCredentials'),
      createdAt: v.number(),
      expiresAt: v.number(),
    }),
  ),

  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      throw new ConvexError('Not authenticated.');
    }

    const child = await ctx.db.get(args.childId);

    if (!child) {
      throw new ConvexError('Child profile not found.');
    }

    const membership = await ctx.db
      .query('householdMembers')
      .withIndex('by_household_auth_user', (q) =>
        q.eq('householdId', child.householdId).eq('authUserId', authUser._id),
      )
      .unique();

    if (!membership || membership.role !== 'parent') {
      throw new ConvexError(
        'You are not authorized to view pairing credentials for this child.',
      );
    }

    const now = Date.now();

    const credentials = await ctx.db
      .query('childPairingCredentials')
      .withIndex('by_child', (q) => q.eq('childId', child._id))
      .collect();

    return credentials
      .filter(
        (credential) =>
          credential.revokedAt === undefined &&
          credential.redeemedAt === undefined &&
          credential.expiresAt > now,
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((credential) => ({
        pairingCredentialId: credential._id,
        createdAt: credential.createdAt,
        expiresAt: credential.expiresAt,
      }));
  },
});

/**
 * Parent-facing device list.
 *
 * We intentionally do not return the Better Auth anonymous user ID.
 * The Parent only needs the grant ID and lifecycle information to
 * manage/revoke device access.
 */
export const listDevicesForChild = query({
  args: {
    childId: v.id('children'),
  },

  returns: v.array(
    v.object({
      accessGrantId: v.id('childDeviceAccessGrants'),
      createdAt: v.number(),
      revokedAt: v.optional(v.number()),
      isActive: v.boolean(),
    }),
  ),

  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      throw new ConvexError('Not authenticated.');
    }

    const child = await ctx.db.get(args.childId);

    if (!child) {
      throw new ConvexError('Child profile not found.');
    }

    const membership = await ctx.db
      .query('householdMembers')
      .withIndex('by_household_auth_user', (q) =>
        q.eq('householdId', child.householdId).eq('authUserId', authUser._id),
      )
      .unique();

    if (!membership || membership.role !== 'parent') {
      throw new ConvexError(
        'You are not authorized to view devices for this child.',
      );
    }

    const grants = await ctx.db
      .query('childDeviceAccessGrants')
      .withIndex('by_child', (q) => q.eq('childId', child._id))
      .collect();

    return grants
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((grant) => ({
        accessGrantId: grant._id,
        createdAt: grant.createdAt,
        revokedAt: grant.revokedAt,
        isActive: grant.revokedAt === undefined,
      }));
  },
});
