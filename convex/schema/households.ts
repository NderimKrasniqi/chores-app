import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const weekdayValidator = v.union(
  v.literal('monday'),
  v.literal('tuesday'),
  v.literal('wednesday'),
  v.literal('thursday'),
  v.literal('friday'),
  v.literal('saturday'),
  v.literal('sunday'),
);

export const householdTables = {
  households: defineTable({
    name: v.string(),

    // Authoritative IANA timezone, e.g. "Europe/Stockholm".
    timezone: v.string(),

    payoutWeekday: weekdayValidator,

    weeklyUnclaimAllowance: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  householdMembers: defineTable({
    householdId: v.id('households'),

    // Better Auth user ID.
    authUserId: v.string(),

    // Every Parent has equal domain authority.
    role: v.literal('parent'),

    joinedAt: v.number(),
  })
    .index('by_auth_user', ['authUserId'])
    .index('by_household', ['householdId'])
    .index(
      'by_household_auth_user',
      ['householdId', 'authUserId'],
    ),

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

    expiresAt: v.optional(v.number()),

    revokedAt: v.optional(v.number()),

    acceptedAt: v.optional(v.number()),

    acceptedByAuthUserId:
      v.optional(v.string()),
  })
    .index('by_household', ['householdId'])
    .index('by_token_hash', ['tokenHash']),
};
