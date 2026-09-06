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

    // All parents have the same domain authority.
    role: v.literal('parent'),

    joinedAt: v.number(),
  })
    .index('by_auth_user', ['authUserId'])
    .index('by_household', ['householdId'])
    .index('by_household_auth_user', ['householdId', 'authUserId']),

  children: defineTable({
    householdId: v.id('households'),

    // No email/account requirement at the profile level.
    displayName: v.string(),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_household', ['householdId']),
});
