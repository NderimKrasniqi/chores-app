import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  households: defineTable({
    name: v.string(),

    // Authoritative IANA timezone, e.g. "Europe/Stockholm".
    timezone: v.string(),

    payoutWeekday: v.union(
      v.literal('monday'),
      v.literal('tuesday'),
      v.literal('wednesday'),
      v.literal('thursday'),
      v.literal('friday'),
      v.literal('saturday'),
      v.literal('sunday'),
    ),

    weeklyUnclaimAllowance: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  householdMembers: defineTable({
    householdId: v.id('households'),

    // Better Auth user ID.
    authUserId: v.string(),

    // Every parent has equal domain authority.
    role: v.literal('parent'),

    joinedAt: v.number(),
  })
    .index('by_auth_user', ['authUserId'])
    .index('by_household', ['householdId'])
    .index('by_household_auth_user', ['householdId', 'authUserId']),

  children: defineTable({
    householdId: v.id('households'),

    // Child profiles do not require email accounts.
    displayName: v.string(),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_household', ['householdId']),

  parentInvites: defineTable({
    householdId: v.id('households'),

    // Hash of the actual invite token.
    // The raw token is never persisted.
    tokenHash: v.string(),

    createdByAuthUserId: v.string(),

    createdAt: v.number(),

    // Parent-invite expiry policy is not specified by the product docs.
    expiresAt: v.optional(v.number()),

    revokedAt: v.optional(v.number()),

    acceptedAt: v.optional(v.number()),
    acceptedByAuthUserId: v.optional(v.string()),
  })
    .index('by_household', ['householdId'])
    .index('by_token_hash', ['tokenHash']),

  childPairingCredentials: defineTable({
    householdId: v.id('households'),
    childId: v.id('children'),

    // QR and manual credentials are separately generated.
    // Only hashes are stored.
    qrTokenHash: v.string(),
    manualCodeHash: v.string(),

    createdByAuthUserId: v.string(),

    createdAt: v.number(),

    // Child pairing credentials expire after 15 minutes.
    expiresAt: v.number(),

    // Per-credential observability for manual redemption attempts.
    // Global failed guesses are tracked separately below because an
    // invalid code may not identify any credential.
    manualAttemptCount: v.number(),
    lastManualAttemptAt: v.optional(v.number()),

    // Parent-controlled revocation.
    revokedAt: v.optional(v.number()),
    revokedByAuthUserId: v.optional(v.string()),

    // Either QR or manual redemption consumes the entire credential.
    redeemedAt: v.optional(v.number()),
    redeemedByAuthUserId: v.optional(v.string()),
  })
    .index('by_household', ['householdId'])
    .index('by_child', ['childId'])
    .index('by_qr_token_hash', ['qrTokenHash'])
    .index('by_manual_code_hash', ['manualCodeHash']),

  /*
   * Manual pairing codes are intentionally human-enterable and
   * therefore need online guessing protection.
   *
   * This bucket is keyed by the authenticated Better Auth anonymous
   * device identity so failed guesses can be recorded even when the
   * supplied code does not correspond to any credential.
   */
  childPairingManualAttemptBuckets: defineTable({
    authUserId: v.string(),

    windowStartedAt: v.number(),
    attemptCount: v.number(),

    // Set when this identity has exceeded the configured attempt policy.
    blockedUntil: v.optional(v.number()),

    updatedAt: v.number(),
  }).index('by_auth_user', ['authUserId']),

  childDeviceAccessGrants: defineTable({
    householdId: v.id('households'),
    childId: v.id('children'),

    // Better Auth user ID belonging to the anonymous authenticated
    // child-device identity.
    authUserId: v.string(),

    // The single-use pairing credential that established this grant.
    pairingCredentialId: v.id('childPairingCredentials'),

    createdAt: v.number(),

    // Revocation is authoritative in Convex even if Better Auth session
    // material remains temporarily present on the physical device.
    revokedAt: v.optional(v.number()),
    revokedByAuthUserId: v.optional(v.string()),
  })
    .index('by_household', ['householdId'])
    .index('by_child', ['childId'])
    .index('by_auth_user', ['authUserId'])
    .index('by_child_auth_user', ['childId', 'authUserId']),
});
