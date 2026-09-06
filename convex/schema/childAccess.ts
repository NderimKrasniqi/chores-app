import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const childAccessTables = {
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

    manualAttemptCount: v.number(),

    lastManualAttemptAt:
      v.optional(v.number()),

    revokedAt:
      v.optional(v.number()),

    revokedByAuthUserId:
      v.optional(v.string()),

    redeemedAt:
      v.optional(v.number()),

    redeemedByAuthUserId:
      v.optional(v.string()),
  })
    .index('by_household', ['householdId'])
    .index('by_child', ['childId'])
    .index(
      'by_qr_token_hash',
      ['qrTokenHash'],
    )
    .index(
      'by_manual_code_hash',
      ['manualCodeHash'],
    ),

  childPairingManualAttemptBuckets:
    defineTable({
      authUserId: v.string(),

      windowStartedAt: v.number(),

      attemptCount: v.number(),

      blockedUntil:
        v.optional(v.number()),

      updatedAt: v.number(),
    }).index(
      'by_auth_user',
      ['authUserId'],
    ),

  childDeviceAccessGrants: defineTable({
    householdId: v.id('households'),
    childId: v.id('children'),

    // Better Auth anonymous Child-device identity.
    authUserId: v.string(),

    pairingCredentialId:
      v.id('childPairingCredentials'),

    createdAt: v.number(),

    revokedAt:
      v.optional(v.number()),

    revokedByAuthUserId:
      v.optional(v.string()),
  })
    .index('by_household', ['householdId'])
    .index('by_child', ['childId'])
    .index('by_auth_user', ['authUserId'])
    .index(
      'by_child_auth_user',
      ['childId', 'authUserId'],
    ),
};
