import {
  ConvexError,
  v,
} from 'convex/values';

import { query } from './_generated/server';
import { authComponent } from './auth';
import {
  requireCurrentParentForHousehold,
} from './lib/auth/parentAuthorization';

function isAnonymousAuthUser(
  user: object,
) {
  return (
    'isAnonymous' in user &&
    user.isAnonymous === true
  );
}

/*
 * Local-device revocation subscription.
 *
 * Saved Child profiles know their own
 * opaque access-grant IDs.
 *
 * The profile chooser subscribes to these
 * statuses so Parent revocation on another
 * device removes the local Child profile
 * reactively.
 *
 * We intentionally return only:
 *
 * - the supplied grant ID
 * - whether it is still active
 *
 * No Child, Household, auth-user, or
 * device metadata is exposed here.
 */
export const getLocalGrantStatuses =
  query({
    args: {
      accessGrantIds:
        v.array(
          v.id(
            'childDeviceAccessGrants',
          ),
        ),
    },

    returns:
      v.array(
        v.object({
          accessGrantId:
            v.id(
              'childDeviceAccessGrants',
            ),

          isActive:
            v.boolean(),
        }),
      ),

    handler: async (
      ctx,
      args,
    ) => {
      const uniqueIds =
        Array.from(
          new Set(
            args.accessGrantIds,
          ),
        );

      const statuses: {
        accessGrantId:
          (typeof uniqueIds)[number];

        isActive:
          boolean;
      }[] = [];

      for (
        const accessGrantId of
        uniqueIds
      ) {
        const grant =
          await ctx.db.get(
            accessGrantId,
          );

        statuses.push({
          accessGrantId,

          isActive:
            grant !== null &&
            grant.revokedAt ===
              undefined,
        });
      }

      return statuses;
    },
  });

/**
 * Child-facing authorization seam.
 *
 * Better Auth proves who the current
 * device identity is.
 *
 * Convex proves whether that identity
 * currently has an active grant to a
 * Child profile.
 */
export const getCurrentChildAccess =
  query({
    args: {},

    returns:
      v.union(
        v.null(),

        v.object({
          accessGrantId:
            v.id(
              'childDeviceAccessGrants',
            ),

          householdId:
            v.id(
              'households',
            ),

          householdName:
            v.string(),

          childId:
            v.id(
              'children',
            ),

          childDisplayName:
            v.string(),

          grantedAt:
            v.number(),
        }),
      ),

    handler: async (
      ctx,
    ) => {
      const authUser =
        await authComponent.safeGetAuthUser(
          ctx,
        );

      if (!authUser) {
        return null;
      }

      if (
        !isAnonymousAuthUser(
          authUser,
        )
      ) {
        return null;
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
        activeGrants.length ===
        0
      ) {
        return null;
      }

      if (
        activeGrants.length >
        1
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
          'Invalid child device access grant.',
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
        accessGrantId:
          grant._id,

        householdId:
          household._id,

        householdName:
          household.name,

        childId:
          child._id,

        childDisplayName:
          child.displayName,

        grantedAt:
          grant.createdAt,
      };
    },
  });

/**
 * Parent-facing list of currently usable
 * pairing credentials.
 *
 * Raw QR tokens, manual codes, and their
 * hashes are never returned.
 */
export const listActivePairingCredentialsForChild =
  query({
    args: {
      childId:
        v.id(
          'children',
        ),
    },

    returns:
      v.array(
        v.object({
          pairingCredentialId:
            v.id(
              'childPairingCredentials',
            ),

          createdAt:
            v.number(),

          expiresAt:
            v.number(),
        }),
      ),

    handler: async (
      ctx,
      args,
    ) => {
      const child =
        await ctx.db.get(
          args.childId,
        );

      if (!child) {
        throw new ConvexError(
          'Child profile not found.',
        );
      }

      await requireCurrentParentForHousehold(
        ctx,
        child.householdId,
      );

      const now =
        Date.now();

      const credentials =
        await ctx.db
          .query(
            'childPairingCredentials',
          )
          .withIndex(
            'by_child',
            (q) =>
              q.eq(
                'childId',
                child._id,
              ),
          )
          .collect();

      return credentials
        .filter(
          (
            credential,
          ) =>
            credential.revokedAt ===
              undefined &&
            credential.redeemedAt ===
              undefined &&
            credential.expiresAt >
              now,
        )
        .sort(
          (a, b) =>
            b.createdAt -
            a.createdAt,
        )
        .map(
          (
            credential,
          ) => ({
            pairingCredentialId:
              credential._id,

            createdAt:
              credential.createdAt,

            expiresAt:
              credential.expiresAt,
          }),
        );
    },
  });

/**
 * Parent-facing device list.
 *
 * We intentionally do not return the
 * Better Auth anonymous user ID.
 *
 * The Parent only needs grant lifecycle
 * information to manage device access.
 */
export const listDevicesForChild =
  query({
    args: {
      childId:
        v.id(
          'children',
        ),
    },

    returns:
      v.array(
        v.object({
          accessGrantId:
            v.id(
              'childDeviceAccessGrants',
            ),

          createdAt:
            v.number(),

          revokedAt:
            v.optional(
              v.number(),
            ),

          isActive:
            v.boolean(),
        }),
      ),

    handler: async (
      ctx,
      args,
    ) => {
      const child =
        await ctx.db.get(
          args.childId,
        );

      if (!child) {
        throw new ConvexError(
          'Child profile not found.',
        );
      }

      await requireCurrentParentForHousehold(
        ctx,
        child.householdId,
      );

      const grants =
        await ctx.db
          .query(
            'childDeviceAccessGrants',
          )
          .withIndex(
            'by_child',
            (q) =>
              q.eq(
                'childId',
                child._id,
              ),
          )
          .collect();

      return grants
        .sort(
          (a, b) =>
            b.createdAt -
            a.createdAt,
        )
        .map(
          (grant) => ({
            accessGrantId:
              grant._id,

            createdAt:
              grant.createdAt,

            revokedAt:
              grant.revokedAt,

            isActive:
              grant.revokedAt ===
              undefined,
          }),
        );
    },
  });
