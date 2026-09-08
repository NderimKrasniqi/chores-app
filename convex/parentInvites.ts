import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { action, internalMutation, mutation, query } from './_generated/server';
import {
  requireCurrentParentAuthUser,
  requireCurrentParentForHousehold,
  requireParentMembershipForHousehold,
} from './lib/auth/parentAuthorization';

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

function generateInviteToken() {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return bytesToHex(bytes);
}

async function hashInviteToken(token: string) {
  const encoded = new TextEncoder().encode(token);

  const digest = await crypto.subtle.digest('SHA-256', encoded);

  return bytesToHex(new Uint8Array(digest));
}

export const create = action({
  args: {
    householdId: v.id('households'),
  },

  returns: v.object({
    inviteId: v.id('parentInvites'),
    token: v.string(),
  }),

  handler: async (
    ctx,
    args,
  ): Promise<{
    inviteId: Id<'parentInvites'>;
    token: string;
  }> => {
    const authUser =
      await requireCurrentParentAuthUser(
        ctx,
      );

    const token = generateInviteToken();
    const tokenHash = await hashInviteToken(token);

    const inviteId: Id<'parentInvites'> = await ctx.runMutation(
      internal.parentInvites.storeGeneratedInvite,
      {
        householdId: args.householdId,
        actorAuthUserId: authUser._id,
        tokenHash,
      },
    );

    return {
      inviteId,
      token,
    };
  },
});

export const accept = action({
  args: {
    token: v.string(),
  },

  returns: v.object({
    householdId: v.id('households'),
    membershipId: v.id('householdMembers'),
  }),

  handler: async (
    ctx,
    args,
  ): Promise<{
    householdId: Id<'households'>;
    membershipId: Id<'householdMembers'>;
  }> => {
    const authUser =
      await requireCurrentParentAuthUser(
        ctx,
      );

    const token = args.token.trim();

    if (!token) {
      throw new ConvexError('Invite token is required.');
    }

    const tokenHash = await hashInviteToken(token);

    return await ctx.runMutation(internal.parentInvites.consumeInvite, {
      tokenHash,
      actorAuthUserId: authUser._id,
    });
  },
});

export const revokeActive = mutation({
  args: {
    householdId: v.id('households'),
  },

  returns: v.number(),

  handler: async (ctx, args): Promise<number> => {
    await requireCurrentParentForHousehold(
      ctx,
      args.householdId,
    );

    const now = Date.now();

    const invites = await ctx.db
      .query('parentInvites')
      .withIndex('by_household', (q) => q.eq('householdId', args.householdId))
      .collect();

    let revokedCount = 0;

    for (const invite of invites) {
      const isActive =
        invite.revokedAt === undefined &&
        invite.acceptedAt === undefined &&
        (invite.expiresAt === undefined || invite.expiresAt > now);

      if (!isActive) {
        continue;
      }

      await ctx.db.patch(invite._id, {
        revokedAt: now,
      });

      revokedCount += 1;
    }

    return revokedCount;
  },
});

export const getActive = query({
  args: {
    householdId: v.id('households'),
  },

  returns: v.union(
    v.null(),
    v.object({
      inviteId: v.id('parentInvites'),
      createdAt: v.number(),
      expiresAt: v.optional(v.number()),
    }),
  ),

  handler: async (ctx, args) => {
    await requireCurrentParentForHousehold(
      ctx,
      args.householdId,
    );

    const now = Date.now();

    const invites = await ctx.db
      .query('parentInvites')
      .withIndex('by_household', (q) => q.eq('householdId', args.householdId))
      .collect();

    const activeInvite = invites
      .filter(
        (invite) =>
          invite.revokedAt === undefined &&
          invite.acceptedAt === undefined &&
          (invite.expiresAt === undefined || invite.expiresAt > now),
      )
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!activeInvite) {
      return null;
    }

    return {
      inviteId: activeInvite._id,
      createdAt: activeInvite.createdAt,
      expiresAt: activeInvite.expiresAt,
    };
  },
});

export const storeGeneratedInvite = internalMutation({
  args: {
    householdId: v.id('households'),
    actorAuthUserId: v.string(),
    tokenHash: v.string(),
  },

  returns: v.id('parentInvites'),

  handler: async (ctx, args): Promise<Id<'parentInvites'>> => {
    await requireParentMembershipForHousehold(
      ctx,
      args.householdId,
      args.actorAuthUserId,
      'You are not authorized to invite a parent to this household.',
    );

    const now = Date.now();

    const existingInvites = await ctx.db
      .query('parentInvites')
      .withIndex('by_household', (q) => q.eq('householdId', args.householdId))
      .collect();

    for (const invite of existingInvites) {
      const isActive =
        invite.revokedAt === undefined &&
        invite.acceptedAt === undefined &&
        (invite.expiresAt === undefined || invite.expiresAt > now);

      if (isActive) {
        await ctx.db.patch(invite._id, {
          revokedAt: now,
        });
      }
    }

    return await ctx.db.insert('parentInvites', {
      householdId: args.householdId,
      tokenHash: args.tokenHash,
      createdByAuthUserId: args.actorAuthUserId,
      createdAt: now,
    });
  },
});

export const consumeInvite = internalMutation({
  args: {
    tokenHash: v.string(),
    actorAuthUserId: v.string(),
  },

  returns: v.object({
    householdId: v.id('households'),
    membershipId: v.id('householdMembers'),
  }),

  handler: async (
    ctx,
    args,
  ): Promise<{
    householdId: Id<'households'>;
    membershipId: Id<'householdMembers'>;
  }> => {
    const invite = await ctx.db
      .query('parentInvites')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', args.tokenHash))
      .unique();

    if (!invite) {
      throw new ConvexError('Invalid parent invite.');
    }

    const now = Date.now();

    if (invite.revokedAt !== undefined) {
      throw new ConvexError('This parent invite has been revoked.');
    }

    if (invite.acceptedAt !== undefined) {
      throw new ConvexError('This parent invite has already been used.');
    }

    if (invite.expiresAt !== undefined && invite.expiresAt <= now) {
      throw new ConvexError('This parent invite has expired.');
    }

    const household = await ctx.db.get(invite.householdId);

    if (!household) {
      throw new ConvexError('Household no longer exists.');
    }

    const existingMembership = await ctx.db
      .query('householdMembers')
      .withIndex('by_household_auth_user', (q) =>
        q
          .eq('householdId', invite.householdId)
          .eq('authUserId', args.actorAuthUserId),
      )
      .unique();

    if (existingMembership) {
      throw new ConvexError('You are already a parent in this household.');
    }

    const membershipId = await ctx.db.insert('householdMembers', {
      householdId: invite.householdId,
      authUserId: args.actorAuthUserId,
      role: 'parent',
      joinedAt: now,
    });

    await ctx.db.patch(invite._id, {
      acceptedAt: now,
      acceptedByAuthUserId: args.actorAuthUserId,
    });

    return {
      householdId: invite.householdId,
      membershipId,
    };
  },
});
