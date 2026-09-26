import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, mutation } from "./_generated/server";
import { authComponent } from "./auth";
import {
  requireCurrentParentAuthUser,
  requireCurrentParentForHousehold,
  requireParentMembershipForHousehold,
} from "./lib/auth/parentAuthorization";
import {
  findActiveChildAccessGrantForCredential,
  getUniqueActiveChildAccessGrantForAuthUser,
} from "./lib/childAccess/activeGrants";

const PAIRING_LIFETIME_MS = 15 * 60 * 1000;

// Implementation security policy.
// The approved architecture requires attempt/rate limits but does not
// prescribe these exact numeric values.
const MANUAL_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_MANUAL_ATTEMPTS_PER_WINDOW = 5;
const MANUAL_BLOCK_DURATION_MS = 15 * 60 * 1000;

// 32 unambiguous characters (no 0/O, 1/I): 6 characters give ~1.07e9 codes.
// Each code lives 15 minutes, works once, and never repeats a stored hash.
const MANUAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MANUAL_CODE_LENGTH = 6;
// Short codes can collide with an old stored hash; retry with a fresh one.
const MAX_GENERATION_ATTEMPTS = 5;

/*
 * Anonymous identities are free to create, so the per-identity attempt
 * bucket below is not a global cap. With 6-character codes, failed manual
 * guesses are also capped deployment-wide. When it trips, only typed codes
 * pause; QR pairing is unaffected.
 */
const pairingRateLimiter = new RateLimiter(components.rateLimiter, {
  failedManualPairing: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 30,
  },
});

type RedemptionSuccess = {
  householdId: Id<"households">;
  childId: Id<"children">;
  accessGrantId: Id<"childDeviceAccessGrants">;
};

type ManualRedemptionResult =
  | {
      status: "success";
      householdId: Id<"households">;
      childId: Id<"children">;
      accessGrantId: Id<"childDeviceAccessGrants">;
    }
  | {
      status: "invalid";
    }
  | {
      status: "rate_limited";
      retryAt: number;
    };

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function generateQrToken() {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return bytesToHex(bytes);
}

function generateManualCode() {
  const bytes = new Uint8Array(MANUAL_CODE_LENGTH);

  crypto.getRandomValues(bytes);

  // The alphabet has exactly 32 characters, so masking is unbiased.
  return Array.from(
    bytes,
    (byte) => MANUAL_CODE_ALPHABET[byte & (MANUAL_CODE_ALPHABET.length - 1)],
  ).join("");
}

function normalizeManualCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function hashSecret(secret: string) {
  const encoded = new TextEncoder().encode(secret);

  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return bytesToHex(new Uint8Array(digest));
}

function isAnonymousAuthUser(user: object) {
  return "isAnonymous" in user && user.isAnonymous === true;
}

export const create = action({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
  },

  returns: v.object({
    pairingCredentialId: v.id("childPairingCredentials"),
    childId: v.id("children"),
    qrToken: v.string(),
    manualCode: v.string(),
    expiresAt: v.number(),
  }),

  handler: async (
    ctx,
    args,
  ): Promise<{
    pairingCredentialId: Id<"childPairingCredentials">;
    childId: Id<"children">;
    qrToken: string;
    manualCode: string;
    expiresAt: number;
  }> => {
    const authUser = await requireCurrentParentAuthUser(ctx);

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const qrToken = generateQrToken();
      const manualCode = generateManualCode();

      const qrTokenHash = await hashSecret(qrToken);

      const manualCodeHash = await hashSecret(normalizeManualCode(manualCode));

      const stored:
        | { status: "collision" }
        | {
            status: "stored";
            pairingCredentialId: Id<"childPairingCredentials">;
            expiresAt: number;
          } = await ctx.runMutation(
        internal.childPairing.storeGeneratedCredential,
        {
          householdId: args.householdId,
          childId: args.childId,
          actorAuthUserId: authUser._id,
          qrTokenHash,
          manualCodeHash,
        },
      );

      if (stored.status === "stored") {
        return {
          pairingCredentialId: stored.pairingCredentialId,
          childId: args.childId,
          qrToken,
          manualCode,
          expiresAt: stored.expiresAt,
        };
      }
    }

    throw new ConvexError("Could not create a pairing code. Please try again.");
  },
});

export const redeemQr = action({
  args: {
    qrToken: v.string(),
  },

  returns: v.object({
    householdId: v.id("households"),
    childId: v.id("children"),
    accessGrantId: v.id("childDeviceAccessGrants"),
  }),

  handler: async (ctx, args): Promise<RedemptionSuccess> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      throw new ConvexError("Not authenticated.");
    }

    if (!isAnonymousAuthUser(authUser)) {
      throw new ConvexError(
        "Child pairing requires an anonymous device session.",
      );
    }

    const qrToken = args.qrToken.trim();

    if (!qrToken) {
      throw new ConvexError("QR pairing token is required.");
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
    householdId: v.id("households"),
    childId: v.id("children"),
    accessGrantId: v.id("childDeviceAccessGrants"),
  }),

  handler: async (ctx, args): Promise<RedemptionSuccess> => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      throw new ConvexError("Not authenticated.");
    }

    if (!isAnonymousAuthUser(authUser)) {
      throw new ConvexError(
        "Child pairing requires an anonymous device session.",
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

    if (result.status === "rate_limited") {
      const minutes = Math.max(
        1,
        Math.ceil((result.retryAt - Date.now()) / 60_000),
      );
      throw new ConvexError(
        `Too many tries right now. Scan the QR code instead, or try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
      );
    }

    if (result.status === "invalid") {
      throw new ConvexError("Invalid or unavailable child pairing code.");
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
    pairingCredentialId: v.id("childPairingCredentials"),
  },

  returns: v.boolean(),

  handler: async (ctx, args): Promise<boolean> => {
    const credential = await ctx.db.get(args.pairingCredentialId);

    if (!credential) {
      throw new ConvexError("Pairing credential not found.");
    }

    const { authUser } = await requireCurrentParentForHousehold(
      ctx,
      credential.householdId,
    );

    if (credential.redeemedAt !== undefined) {
      throw new ConvexError(
        "This pairing credential has already been redeemed. Revoke the child device instead.",
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
    accessGrantId: v.id("childDeviceAccessGrants"),
  },

  returns: v.boolean(),

  handler: async (ctx, args): Promise<boolean> => {
    const grant = await ctx.db.get(args.accessGrantId);

    if (!grant) {
      throw new ConvexError("Child device access grant not found.");
    }

    const { authUser } = await requireCurrentParentForHousehold(
      ctx,
      grant.householdId,
    );

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
    householdId: v.id("households"),
    childId: v.id("children"),
    actorAuthUserId: v.string(),
    qrTokenHash: v.string(),
    manualCodeHash: v.string(),
  },

  returns: v.union(
    v.object({ status: v.literal("collision") }),
    v.object({
      status: v.literal("stored"),
      pairingCredentialId: v.id("childPairingCredentials"),
      expiresAt: v.number(),
    }),
  ),

  handler: async (
    ctx,
    args,
  ): Promise<
    | { status: "collision" }
    | {
        status: "stored";
        pairingCredentialId: Id<"childPairingCredentials">;
        expiresAt: number;
      }
  > => {
    await requireParentMembershipForHousehold(
      ctx,
      args.householdId,
      args.actorAuthUserId,
      "You are not authorized to pair child devices for this household.",
    );

    const child = await ctx.db.get(args.childId);

    if (!child || child.householdId !== args.householdId) {
      throw new ConvexError("Child does not belong to this household.");
    }

    /*
     * The generated secrets are random, but verify that neither
     * hash already exists before persisting. This protects the
     * lookup assumptions used during redemption.
     */
    const existingQrCredential = await ctx.db
      .query("childPairingCredentials")
      .withIndex("by_qr_token_hash", (q) =>
        q.eq("qrTokenHash", args.qrTokenHash),
      )
      .first();

    if (existingQrCredential) {
      return { status: "collision" };
    }

    const existingManualCredential = await ctx.db
      .query("childPairingCredentials")
      .withIndex("by_manual_code_hash", (q) =>
        q.eq("manualCodeHash", args.manualCodeHash),
      )
      .first();

    // Any stored hash, even an expired one, keeps redemption's unique()
    // lookup safe; the caller retries with a fresh code.
    if (existingManualCredential) {
      return { status: "collision" };
    }

    const now = Date.now();

    /*
     * Convex mutation time is authoritative.
     * The client/action does not choose the expiry.
     */
    const expiresAt = now + PAIRING_LIFETIME_MS;

    const pairingCredentialId = await ctx.db.insert("childPairingCredentials", {
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
      status: "stored",
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
    householdId: v.id("households"),
    childId: v.id("children"),
    accessGrantId: v.id("childDeviceAccessGrants"),
  }),

  handler: async (ctx, args): Promise<RedemptionSuccess> => {
    const credential = await ctx.db
      .query("childPairingCredentials")
      .withIndex("by_qr_token_hash", (q) =>
        q.eq("qrTokenHash", args.qrTokenHash),
      )
      .unique();

    if (!credential) {
      throw new ConvexError("Invalid or unavailable QR pairing token.");
    }

    const now = Date.now();

    if (credential.revokedAt !== undefined) {
      throw new ConvexError("Invalid or unavailable QR pairing token.");
    }

    /*
     * If the same authenticated anonymous identity retries after
     * successful redemption, return the existing active grant.
     * This is idempotent; the credential is not consumed twice.
     */
    if (credential.redeemedAt !== undefined) {
      if (credential.redeemedByAuthUserId !== args.actorAuthUserId) {
        throw new ConvexError("Invalid or unavailable QR pairing token.");
      }

      const existingGrant = await findActiveChildAccessGrantForCredential(
        ctx,
        args.actorAuthUserId,
        credential._id,
      );

      if (!existingGrant) {
        throw new ConvexError("Invalid or unavailable QR pairing token.");
      }

      return {
        householdId: existingGrant.householdId,
        childId: existingGrant.childId,
        accessGrantId: existingGrant._id,
      };
    }

    if (credential.expiresAt <= now) {
      throw new ConvexError("Invalid or unavailable QR pairing token.");
    }

    const activeGrant = await getUniqueActiveChildAccessGrantForAuthUser(
      ctx,
      args.actorAuthUserId,
    );

    if (activeGrant) {
      throw new ConvexError(
        "This anonymous device identity is already paired to a child profile.",
      );
    }

    const accessGrantId = await ctx.db.insert("childDeviceAccessGrants", {
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
      status: v.literal("success"),
      householdId: v.id("households"),
      childId: v.id("children"),
      accessGrantId: v.id("childDeviceAccessGrants"),
    }),

    v.object({
      status: v.literal("invalid"),
    }),

    v.object({
      status: v.literal("rate_limited"),
      retryAt: v.number(),
    }),
  ),

  handler: async (ctx, args): Promise<ManualRedemptionResult> => {
    const now = Date.now();

    // Deployment-wide guess budget, checked before touching any credential.
    const globalBudget = await pairingRateLimiter.check(
      ctx,
      "failedManualPairing",
    );

    if (!globalBudget.ok) {
      return {
        status: "rate_limited",
        retryAt: now + globalBudget.retryAfter,
      };
    }

    let attemptBucket = await ctx.db
      .query("childPairingManualAttemptBuckets")
      .withIndex("by_auth_user", (q) =>
        q.eq("authUserId", args.actorAuthUserId),
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
        status: "rate_limited",
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
      .query("childPairingCredentials")
      .withIndex("by_manual_code_hash", (q) =>
        q.eq("manualCodeHash", args.manualCodeHash),
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
      const existingGrant = await findActiveChildAccessGrantForCredential(
        ctx,
        args.actorAuthUserId,
        credential._id,
      );

      if (existingGrant) {
        if (attemptBucket) {
          await ctx.db.delete(attemptBucket._id);
        }

        return {
          status: "success",
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
      const activeGrant = await getUniqueActiveChildAccessGrantForAuthUser(
        ctx,
        args.actorAuthUserId,
      );

      if (!activeGrant) {
        const accessGrantId = await ctx.db.insert("childDeviceAccessGrants", {
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
          status: "success",
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

    // Spend one token of the global budget; committed with this result.
    await pairingRateLimiter.limit(ctx, "failedManualPairing");

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
      await ctx.db.insert("childPairingManualAttemptBuckets", {
        authUserId: args.actorAuthUserId,

        windowStartedAt: now,
        attemptCount: nextAttemptCount,

        blockedUntil,

        updatedAt: now,
      });
    }

    if (shouldBlock) {
      return {
        status: "rate_limited",
        retryAt: blockedUntil as number,
      };
    }

    return {
      status: "invalid",
    };
  },
});
