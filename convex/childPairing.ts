import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { action, internalMutation, mutation } from './_generated/server';
import { authComponent } from './auth';

const PAIRING_LIFETIME_MS = 15 * 60 * 1000;

// Implementation security policy.
// The approved architecture requires attempt/rate limits but does not
// prescribe these exact numeric values.
const MANUAL_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_MANUAL_ATTEMPTS_PER_WINDOW = 5;
const MANUAL_BLOCK_DURATION_MS = 15 * 60 * 1000;

const MANUAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type RedemptionSuccess = {
  householdId: Id<'households'>;
  childId: Id<'children'>;
  accessGrantId: Id<'childDeviceAccessGrants'>;
};

type ManualRedemptionResult =
  | {
      status: 'success';
      householdId: Id<'households'>;
      childId: Id<'children'>;
      accessGrantId: Id<'childDeviceAccessGrants'>;
    }
  | {
      status: 'invalid';
    }
  | {
      status: 'rate_limited';
      retryAt: number;
    };

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

function generateQrToken() {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return bytesToHex(bytes);
}

function generateManualCode() {
  const bytes = new Uint8Array(10);

  crypto.getRandomValues(bytes);

  const characters = Array.from(
    bytes,
    (byte) => MANUAL_CODE_ALPHABET[byte & (MANUAL_CODE_ALPHABET.length - 1)],
  );

  return `${characters.slice(0, 5).join('')}-${characters.slice(5).join('')}`;
}

function normalizeManualCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

async function hashSecret(secret: string) {
  const encoded = new TextEncoder().encode(secret);

  const digest = await crypto.subtle.digest('SHA-256', encoded);

  return bytesToHex(new Uint8Array(digest));
}

function isAnonymousAuthUser(user: object) {
  return 'isAnonymous' in user && user.isAnonymous === true;
}

export const create = action({
  args: {
    householdId: v.id('households'),
    childId: v.id('children'),
  },

  returns: v.object({
    pairingCredentialId: v.id('childPairingCredentials'),
    childId: v.id('children'),
    qrToken: v.string(),
    manualCode: v.string(),
    expiresAt: v.number(),
  }),

  handler: async (
    ctx,
    args,
  ): Promise<{
    pairingCredentialId: Id<'childPairingCredentials'>;
    childId: Id<'children'>;
    qrToken: string;
    manualCode: string;
    expiresAt: number;
  }> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      throw new ConvexError('Not authenticated.');
    }

    const qrToken = generateQrToken();
    const manualCode = generateManualCode();

    const qrTokenHash = await hashSecret(qrToken);

    const manualCodeHash = await hashSecret(normalizeManualCode(manualCode));

    const stored: {
      pairingCredentialId: Id<'childPairingCredentials'>;
      expiresAt: number;
    } = await ctx.runMutation(internal.childPairing.storeGeneratedCredential, {
      householdId: args.householdId,
      childId: args.childId,
      actorAuthUserId: authUser._id,
      qrTokenHash,
      manualCodeHash,
    });

    return {
      pairingCredentialId: stored.pairingCredentialId,
      childId: args.childId,
      qrToken,
      manualCode,
      expiresAt: stored.expiresAt,
    };
  },
});

export const redeemQr = action({
  args: {
    qrToken: v.string(),
  },

  returns: v.object({
    householdId: v.id('households'),
    childId: v.id('children'),
    accessGrantId: v.id('childDeviceAccessGrants'),
  }),

  handler: async (ctx, args): Promise<RedemptionSuccess> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      throw new ConvexError('Not authenticated.');
    }

    if (!isAnonymousAuthUser(authUser)) {
      throw new ConvexError(
        'Child pairing requires an anonymous device session.',
      );
    }

    const qrToken = args.qrToken.trim();

    if (!qrToken) {
      throw new ConvexError('QR pairing token is required.');
    }

    const qrTokenHash = await hashSecret(qrToken);

    const result: RedemptionSuccess = await ctx.runMutation(
      internal.childPairing.consumeQrCredential,
      {
        qrTokenHash,
        actorAuthUserId: authUser._id,
      },
    );

    return result;
  },
});

export const redeemManual = action({
  args: {
    manualCode: v.string(),
  },

  returns: v.object({
    householdId: v.id('households'),
    childId: v.id('children'),
    accessGrantId: v.id('childDeviceAccessGrants'),
  }),

  handler: async (ctx, args): Promise<RedemptionSuccess> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      throw new ConvexError('Not authenticated.');
    }

    if (!isAnonymousAuthUser(authUser)) {
      throw new ConvexError(
        'Child pairing requires an anonymous device session.',
      );
    }

    const normalizedManualCode = normalizeManualCode(args.manualCode);

    const manualCodeHash = await hashSecret(normalizedManualCode);

    const result: ManualRedemptionResult = await ctx.runMutation(
      internal.childPairing.consumeManualCredential,
      {
        manualCodeHash,
        actorAuthUserId: authUser._id,
      },
    );

    if (result.status === 'rate_limited') {
      throw new ConvexError(
        `Too many manual pairing attempts. Try again after ${new Date(
          result.retryAt,
        ).toISOString()}.`,
      );
    }

    if (result.status === 'invalid') {
      throw new ConvexError('Invalid or unavailable child pairing code.');
    }

    return {
      householdId: result.householdId,
      childId: result.childId,
      accessGrantId: result.accessGrantId,
    };
  },
});

export const revokeCredential = mutation({
  args: {
    pairingCredentialId: v.id('childPairingCredentials'),
  },

  returns: v.boolean(),

  handler: async (ctx, args): Promise<boolean> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      throw new ConvexError('Not authenticated.');
    }

    const credential = await ctx.db.get(args.pairingCredentialId);

    if (!credential) {
      throw new ConvexError('Pairing credential not found.');
    }

    const membership = await ctx.db
      .query('householdMembers')
      .withIndex('by_household_auth_user', (q) =>
        q
          .eq('householdId', credential.householdId)
          .eq('authUserId', authUser._id),
      )
      .unique();

    if (!membership || membership.role !== 'parent') {
      throw new ConvexError(
        'You are not authorized to revoke this pairing credential.',
      );
    }

    if (credential.redeemedAt !== undefined) {
      throw new ConvexError(
        'This pairing credential has already been redeemed. Revoke the child device instead.',
      );
    }

    if (credential.revokedAt !== undefined) {
      return false;
    }

    if (credential.expiresAt <= Date.now()) {
      return false;
    }

    await ctx.db.patch(credential._id, {
      revokedAt: Date.now(),
      revokedByAuthUserId: authUser._id,
    });

    return true;
  },
});

export const revokeDevice = mutation({
  args: {
    accessGrantId: v.id('childDeviceAccessGrants'),
  },

  returns: v.boolean(),

  handler: async (ctx, args): Promise<boolean> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      throw new ConvexError('Not authenticated.');
    }

    const grant = await ctx.db.get(args.accessGrantId);

    if (!grant) {
      throw new ConvexError('Child device access grant not found.');
    }

    const membership = await ctx.db
      .query('householdMembers')
      .withIndex('by_household_auth_user', (q) =>
        q.eq('householdId', grant.householdId).eq('authUserId', authUser._id),
      )
      .unique();

    if (!membership || membership.role !== 'parent') {
      throw new ConvexError(
        'You are not authorized to revoke this child device.',
      );
    }

    if (grant.revokedAt !== undefined) {
      return false;
    }

    await ctx.db.patch(grant._id, {
      revokedAt: Date.now(),
      revokedByAuthUserId: authUser._id,
    });

    return true;
  },
});

export const storeGeneratedCredential = internalMutation({
  args: {
    householdId: v.id('households'),
    childId: v.id('children'),
    actorAuthUserId: v.string(),
    qrTokenHash: v.string(),
    manualCodeHash: v.string(),
  },

  returns: v.object({
    pairingCredentialId: v.id('childPairingCredentials'),
    expiresAt: v.number(),
  }),

  handler: async (
    ctx,
    args,
  ): Promise<{
    pairingCredentialId: Id<'childPairingCredentials'>;
    expiresAt: number;
  }> => {
    const membership = await ctx.db
      .query('householdMembers')
      .withIndex('by_household_auth_user', (q) =>
        q
          .eq('householdId', args.householdId)
          .eq('authUserId', args.actorAuthUserId),
      )
      .unique();

    if (!membership || membership.role !== 'parent') {
      throw new ConvexError(
        'You are not authorized to pair child devices for this household.',
      );
    }

    const child = await ctx.db.get(args.childId);

    if (!child || child.householdId !== args.householdId) {
      throw new ConvexError('Child does not belong to this household.');
    }

    /*
     * The generated secrets are random, but verify that neither
     * hash already exists before persisting. This protects the
     * lookup assumptions used during redemption.
     */
    const existingQrCredential = await ctx.db
      .query('childPairingCredentials')
      .withIndex('by_qr_token_hash', (q) =>
        q.eq('qrTokenHash', args.qrTokenHash),
      )
      .first();

    if (existingQrCredential) {
      throw new ConvexError(
        'Generated QR pairing credential collision. Generate a new credential.',
      );
    }

    const existingManualCredential = await ctx.db
      .query('childPairingCredentials')
      .withIndex('by_manual_code_hash', (q) =>
        q.eq('manualCodeHash', args.manualCodeHash),
      )
      .first();

    if (existingManualCredential) {
      throw new ConvexError(
        'Generated manual pairing credential collision. Generate a new credential.',
      );
    }

    const now = Date.now();

    /*
     * Convex mutation time is authoritative.
     * The client/action does not choose the expiry.
     */
    const expiresAt = now + PAIRING_LIFETIME_MS;

    const pairingCredentialId = await ctx.db.insert('childPairingCredentials', {
      householdId: args.householdId,
      childId: args.childId,

      qrTokenHash: args.qrTokenHash,
      manualCodeHash: args.manualCodeHash,

      createdByAuthUserId: args.actorAuthUserId,

      createdAt: now,
      expiresAt,

      manualAttemptCount: 0,
    });

    return {
      pairingCredentialId,
      expiresAt,
    };
  },
});

export const consumeQrCredential = internalMutation({
  args: {
    qrTokenHash: v.string(),
    actorAuthUserId: v.string(),
  },

  returns: v.object({
    householdId: v.id('households'),
    childId: v.id('children'),
    accessGrantId: v.id('childDeviceAccessGrants'),
  }),

  handler: async (ctx, args): Promise<RedemptionSuccess> => {
    const credential = await ctx.db
      .query('childPairingCredentials')
      .withIndex('by_qr_token_hash', (q) =>
        q.eq('qrTokenHash', args.qrTokenHash),
      )
      .unique();

    if (!credential) {
      throw new ConvexError('Invalid or unavailable QR pairing token.');
    }

    const now = Date.now();

    if (credential.revokedAt !== undefined) {
      throw new ConvexError('Invalid or unavailable QR pairing token.');
    }

    /*
     * If the same authenticated anonymous identity retries after
     * successful redemption, return the existing active grant.
     * This is idempotent; the credential is not consumed twice.
     */
    if (credential.redeemedAt !== undefined) {
      if (credential.redeemedByAuthUserId !== args.actorAuthUserId) {
        throw new ConvexError('Invalid or unavailable QR pairing token.');
      }

      const existingGrants = await ctx.db
        .query('childDeviceAccessGrants')
        .withIndex('by_auth_user', (q) =>
          q.eq('authUserId', args.actorAuthUserId),
        )
        .collect();

      const existingGrant = existingGrants.find(
        (grant) =>
          grant.pairingCredentialId === credential._id &&
          grant.revokedAt === undefined,
      );

      if (!existingGrant) {
        throw new ConvexError('Invalid or unavailable QR pairing token.');
      }

      return {
        householdId: existingGrant.householdId,
        childId: existingGrant.childId,
        accessGrantId: existingGrant._id,
      };
    }

    if (credential.expiresAt <= now) {
      throw new ConvexError('Invalid or unavailable QR pairing token.');
    }

    const grantsForIdentity = await ctx.db
      .query('childDeviceAccessGrants')
      .withIndex('by_auth_user', (q) =>
        q.eq('authUserId', args.actorAuthUserId),
      )
      .collect();

    const activeGrant = grantsForIdentity.find(
      (grant) => grant.revokedAt === undefined,
    );

    if (activeGrant) {
      throw new ConvexError(
        'This anonymous device identity is already paired to a child profile.',
      );
    }

    const accessGrantId = await ctx.db.insert('childDeviceAccessGrants', {
      householdId: credential.householdId,
      childId: credential.childId,

      authUserId: args.actorAuthUserId,

      pairingCredentialId: credential._id,

      createdAt: now,
    });

    await ctx.db.patch(credential._id, {
      redeemedAt: now,
      redeemedByAuthUserId: args.actorAuthUserId,
    });

    return {
      householdId: credential.householdId,
      childId: credential.childId,
      accessGrantId,
    };
  },
});

export const consumeManualCredential = internalMutation({
  args: {
    manualCodeHash: v.string(),
    actorAuthUserId: v.string(),
  },

  returns: v.union(
    v.object({
      status: v.literal('success'),
      householdId: v.id('households'),
      childId: v.id('children'),
      accessGrantId: v.id('childDeviceAccessGrants'),
    }),

    v.object({
      status: v.literal('invalid'),
    }),

    v.object({
      status: v.literal('rate_limited'),
      retryAt: v.number(),
    }),
  ),

  handler: async (ctx, args): Promise<ManualRedemptionResult> => {
    const now = Date.now();

    let attemptBucket = await ctx.db
      .query('childPairingManualAttemptBuckets')
      .withIndex('by_auth_user', (q) =>
        q.eq('authUserId', args.actorAuthUserId),
      )
      .unique();

    /*
     * An active block is checked before touching the supplied
     * credential hash.
     */
    if (
      attemptBucket?.blockedUntil !== undefined &&
      attemptBucket.blockedUntil > now
    ) {
      return {
        status: 'rate_limited',
        retryAt: attemptBucket.blockedUntil,
      };
    }

    /*
     * Expired blocks/windows begin a clean attempt window.
     */
    if (
      attemptBucket &&
      (attemptBucket.blockedUntil !== undefined ||
        now - attemptBucket.windowStartedAt >= MANUAL_ATTEMPT_WINDOW_MS)
    ) {
      await ctx.db.patch(attemptBucket._id, {
        windowStartedAt: now,
        attemptCount: 0,
        blockedUntil: undefined,
        updatedAt: now,
      });

      attemptBucket = {
        ...attemptBucket,
        windowStartedAt: now,
        attemptCount: 0,
        blockedUntil: undefined,
        updatedAt: now,
      };
    }

    const credential = await ctx.db
      .query('childPairingCredentials')
      .withIndex('by_manual_code_hash', (q) =>
        q.eq('manualCodeHash', args.manualCodeHash),
      )
      .unique();

    /*
     * Same-device retry after a successful manual redemption is
     * idempotent, just like QR redemption.
     */
    if (
      credential &&
      credential.revokedAt === undefined &&
      credential.redeemedAt !== undefined &&
      credential.redeemedByAuthUserId === args.actorAuthUserId
    ) {
      const existingGrants = await ctx.db
        .query('childDeviceAccessGrants')
        .withIndex('by_auth_user', (q) =>
          q.eq('authUserId', args.actorAuthUserId),
        )
        .collect();

      const existingGrant = existingGrants.find(
        (grant) =>
          grant.pairingCredentialId === credential._id &&
          grant.revokedAt === undefined,
      );

      if (existingGrant) {
        if (attemptBucket) {
          await ctx.db.delete(attemptBucket._id);
        }

        return {
          status: 'success',
          householdId: existingGrant.householdId,
          childId: existingGrant.childId,
          accessGrantId: existingGrant._id,
        };
      }
    }

    const credentialIsAvailable =
      credential !== null &&
      credential.revokedAt === undefined &&
      credential.redeemedAt === undefined &&
      credential.expiresAt > now;

    if (credentialIsAvailable) {
      const grantsForIdentity = await ctx.db
        .query('childDeviceAccessGrants')
        .withIndex('by_auth_user', (q) =>
          q.eq('authUserId', args.actorAuthUserId),
        )
        .collect();

      const activeGrant = grantsForIdentity.find(
        (grant) => grant.revokedAt === undefined,
      );

      if (!activeGrant) {
        const accessGrantId = await ctx.db.insert('childDeviceAccessGrants', {
          householdId: credential.householdId,
          childId: credential.childId,

          authUserId: args.actorAuthUserId,

          pairingCredentialId: credential._id,

          createdAt: now,
        });

        await ctx.db.patch(credential._id, {
          manualAttemptCount: credential.manualAttemptCount + 1,
          lastManualAttemptAt: now,
          redeemedAt: now,
          redeemedByAuthUserId: args.actorAuthUserId,
        });

        /*
         * Successful pairing resets this anonymous identity's
         * manual-attempt bucket.
         */
        if (attemptBucket) {
          await ctx.db.delete(attemptBucket._id);
        }

        return {
          status: 'success',
          householdId: credential.householdId,
          childId: credential.childId,
          accessGrantId,
        };
      }
    }

    /*
     * From this point onward the attempt is invalid:
     * - no matching credential,
     * - expired credential,
     * - revoked credential,
     * - credential already used by another identity, or
     * - this anonymous identity already has another active grant.
     *
     * Do not throw here. Throwing would roll back the attempt
     * counter. Return a result so the mutation commits the
     * security state; the public action throws afterward.
     */

    if (credential) {
      await ctx.db.patch(credential._id, {
        manualAttemptCount: credential.manualAttemptCount + 1,
        lastManualAttemptAt: now,
      });
    }

    const currentAttemptCount = attemptBucket?.attemptCount ?? 0;

    const nextAttemptCount = currentAttemptCount + 1;

    const shouldBlock = nextAttemptCount >= MAX_MANUAL_ATTEMPTS_PER_WINDOW;

    const blockedUntil = shouldBlock
      ? now + MANUAL_BLOCK_DURATION_MS
      : undefined;

    if (attemptBucket) {
      await ctx.db.patch(attemptBucket._id, {
        attemptCount: nextAttemptCount,
        blockedUntil,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('childPairingManualAttemptBuckets', {
        authUserId: args.actorAuthUserId,

        windowStartedAt: now,
        attemptCount: nextAttemptCount,

        blockedUntil,

        updatedAt: now,
      });
    }

    if (shouldBlock) {
      return {
        status: 'rate_limited',
        retryAt: blockedUntil as number,
      };
    }

    return {
      status: 'invalid',
    };
  },
});
