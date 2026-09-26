import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";
import {
  isAnonymousAuthUser,
  requireCurrentParentAuthUser,
  requireCurrentParentForHousehold,
} from "./lib/auth/parentAuthorization";
import { calculateRunningBalanceForChild } from "./lib/finance/financialProjection";
import { ensureCurrentPayoutPeriod } from "./lib/finance/payoutPeriods";
import {
  normalizeHouseholdTimezone,
  updateHouseholdTimezone,
  updateHouseholdWeeklyUnclaimAllowance,
} from "./lib/householdSettings";

const payoutWeekdayValidator = v.union(
  v.literal("monday"),
  v.literal("tuesday"),
  v.literal("wednesday"),
  v.literal("thursday"),
  v.literal("friday"),
  v.literal("saturday"),
  v.literal("sunday"),
);

export const create = mutation({
  args: {
    name: v.string(),
    timezone: v.string(),
    payoutWeekday: payoutWeekdayValidator,
    weeklyUnclaimAllowance: v.number(),
    children: v.array(
      v.object({
        displayName: v.string(),
      }),
    ),
  },

  returns: v.object({
    householdId: v.id("households"),
    membershipId: v.id("householdMembers"),
    childIds: v.array(v.id("children")),
  }),

  handler: async (ctx, args) => {
    const authUser = await requireCurrentParentAuthUser(ctx);

    const householdName = args.name.trim();

    if (!householdName) {
      throw new ConvexError("Household name is required.");
    }

    if (
      !Number.isSafeInteger(args.weeklyUnclaimAllowance) ||
      args.weeklyUnclaimAllowance < 0
    ) {
      throw new ConvexError(
        "Weekly unclaim allowance must be a non-negative whole number.",
      );
    }

    const children = args.children.map((child) => {
      const displayName = child.displayName.trim();

      if (!displayName) {
        throw new ConvexError("Child name cannot be empty.");
      }

      return {
        displayName,
      };
    });

    const timezone = normalizeHouseholdTimezone(args.timezone);
    const now = Date.now();

    const householdId = await ctx.db.insert("households", {
      name: householdName,
      timezone,
      payoutWeekday: args.payoutWeekday,
      weeklyUnclaimAllowance: args.weeklyUnclaimAllowance,
      createdAt: now,
      updatedAt: now,
    });

    const membershipId = await ctx.db.insert("householdMembers", {
      householdId,
      authUserId: authUser._id,
      role: "parent",
      joinedAt: now,
    });

    const childIds: Id<"children">[] = [];

    for (const child of children) {
      const childId = await ctx.db.insert("children", {
        householdId,
        displayName: child.displayName,
        createdAt: now,
        updatedAt: now,
      });

      childIds.push(childId);
    }

    await ensureCurrentPayoutPeriod(ctx, householdId, now);

    return {
      householdId,
      membershipId,
      childIds,
    };
  },
});

export const listForCurrentParent = query({
  args: {},

  returns: v.array(
    v.object({
      householdId: v.id("households"),
      name: v.string(),
      timezone: v.string(),
      payoutWeekday: payoutWeekdayValidator,
      weeklyUnclaimAllowance: v.number(),
      parents: v.array(
        v.object({
          membershipId: v.id("householdMembers"),
          displayName: v.string(),
          isCurrent: v.boolean(),
        }),
      ),
      children: v.array(
        v.object({
          childId: v.id("children"),
          displayName: v.string(),
        }),
      ),
    }),
  ),

  handler: async (ctx) => {
    const authUser = await requireCurrentParentAuthUser(ctx);

    const memberships = await ctx.db
      .query("householdMembers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUser._id))
      .take(50);

    const result = [];

    for (const membership of memberships) {
      const household = await ctx.db.get(membership.householdId);

      if (!household) {
        continue;
      }

      const [children, householdMemberships] = await Promise.all([
        ctx.db
          .query("children")
          .withIndex("by_household", (q) => q.eq("householdId", household._id))
          .take(100)
          .then((rows) =>
            rows.filter((child) => child.archivedAt === undefined),
          ),
        ctx.db
          .query("householdMembers")
          .withIndex("by_household", (q) => q.eq("householdId", household._id))
          .take(50),
      ]);

      const parents = (
        await Promise.all(
          householdMemberships.map(async (householdMembership) => {
            const parent = await authComponent.getAnyUserById(
              ctx,
              householdMembership.authUserId,
            );

            if (!parent || isAnonymousAuthUser(parent)) {
              return null;
            }

            return {
              membershipId: householdMembership._id,
              displayName: parent.name.trim() || "Parent",
              isCurrent: householdMembership.authUserId === authUser._id,
            };
          }),
        )
      ).filter((parent) => parent !== null);

      parents.sort(
        (left, right) => Number(right.isCurrent) - Number(left.isCurrent),
      );

      result.push({
        householdId: household._id,
        name: household.name,
        timezone: household.timezone,
        payoutWeekday: household.payoutWeekday,
        weeklyUnclaimAllowance: household.weeklyUnclaimAllowance,
        parents,
        children: children.map((child) => ({
          childId: child._id,
          displayName: child.displayName,
        })),
      });
    }

    return result;
  },
});

export const setTimezone = mutation({
  args: {
    householdId: v.id("households"),
    timezone: v.string(),
  },

  returns: v.object({
    householdId: v.id("households"),
    timezone: v.string(),
    currentPeriodEndAt: v.number(),
  }),

  handler: async (ctx, args) => {
    await requireCurrentParentForHousehold(ctx, args.householdId);

    return await updateHouseholdTimezone(ctx, args.householdId, args.timezone);
  },
});

export const setWeeklyUnclaimAllowance = mutation({
  args: {
    householdId: v.id("households"),
    weeklyUnclaimAllowance: v.number(),
  },

  returns: v.object({
    householdId: v.id("households"),
    weeklyUnclaimAllowance: v.number(),
  }),

  handler: async (ctx, args) => {
    await requireCurrentParentForHousehold(ctx, args.householdId);

    return await updateHouseholdWeeklyUnclaimAllowance(
      ctx,
      args.householdId,
      args.weeklyUnclaimAllowance,
    );
  },
});

export const setPayoutWeekday = mutation({
  args: {
    householdId: v.id("households"),

    payoutWeekday: payoutWeekdayValidator,
  },

  returns: v.object({
    householdId: v.id("households"),

    payoutWeekday: payoutWeekdayValidator,

    currentPeriodEndAt: v.number(),
  }),

  handler: async (ctx, args) => {
    await requireCurrentParentForHousehold(ctx, args.householdId);

    const now = Date.now();

    /*
     * Persist the current period before
     * changing the Household setting.
     *
     * Its existing end boundary is now
     * immutable. The new weekday is used
     * only when the next period is opened.
     */
    const currentPeriod = await ensureCurrentPayoutPeriod(
      ctx,
      args.householdId,
      now,
    );

    await ctx.db.patch(args.householdId, {
      payoutWeekday: args.payoutWeekday,

      updatedAt: now,
    });

    return {
      householdId: args.householdId,

      payoutWeekday: args.payoutWeekday,

      currentPeriodEndAt: currentPeriod.endAt,
    };
  },
});

const MAX_CHILD_NAME_LENGTH = 40;

function normalizeChildName(value: string) {
  const displayName = value.trim();
  if (!displayName) {
    throw new ConvexError("Child name cannot be empty.");
  }
  if (displayName.length > MAX_CHILD_NAME_LENGTH) {
    throw new ConvexError("Child name is too long.");
  }
  return displayName;
}

async function requireActiveChildForParent(
  ctx: MutationCtx,
  childId: Id<"children">,
) {
  const child = await ctx.db.get(childId);
  if (!child || child.archivedAt !== undefined) {
    throw new ConvexError("Child not found.");
  }
  const { authUser } = await requireCurrentParentForHousehold(
    ctx,
    child.householdId,
  );
  return { child, authUser };
}

export const addChild = mutation({
  args: {
    householdId: v.id("households"),
    displayName: v.string(),
  },
  returns: v.id("children"),
  handler: async (ctx, args) => {
    await requireCurrentParentForHousehold(ctx, args.householdId);
    const now = Date.now();
    return await ctx.db.insert("children", {
      householdId: args.householdId,
      displayName: normalizeChildName(args.displayName),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const renameChild = mutation({
  args: {
    childId: v.id("children"),
    displayName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { child } = await requireActiveChildForParent(ctx, args.childId);
    await ctx.db.patch(child._id, {
      displayName: normalizeChildName(args.displayName),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/*
 * Why a child can't be removed yet, so the Parent sees what to settle first.
 * Removal is only allowed when nothing about this child is open.
 */
const archiveBlockerValidator = v.union(
  v.literal("balance"),
  v.literal("pending_payout"),
  v.literal("active_extra"),
  v.literal("awaiting_review"),
);

async function findArchiveBlockers(ctx: MutationCtx, childId: Id<"children">) {
  const blockers: Array<
    "balance" | "pending_payout" | "active_extra" | "awaiting_review"
  > = [];

  const balance = await calculateRunningBalanceForChild(ctx, childId);
  if (balance.balanceSek !== 0) blockers.push("balance");

  const pendingPayout = await ctx.db
    .query("payouts")
    .withIndex("by_child_status_created_at", (q) =>
      q.eq("childId", childId).eq("status", "pending"),
    )
    .first();
  if (pendingPayout) blockers.push("pending_payout");

  for (const state of ["claimed", "submitted", "redo_required"] as const) {
    const claim = await ctx.db
      .query("choreClaims")
      .withIndex("by_child_state", (q) =>
        q.eq("childId", childId).eq("state", state),
      )
      .first();
    if (claim) {
      blockers.push("active_extra");
      break;
    }
  }

  for (const state of ["submitted", "redo_required"] as const) {
    const occurrence = await ctx.db
      .query("choreOccurrences")
      .withIndex("by_personal_child_state_availability", (q) =>
        q.eq("personalChildId", childId).eq("state", state),
      )
      .first();
    if (occurrence) {
      blockers.push("awaiting_review");
      break;
    }
  }

  return blockers;
}

export const archiveChild = mutation({
  args: {
    childId: v.id("children"),
  },
  returns: v.union(
    v.object({ status: v.literal("archived") }),
    v.object({
      status: v.literal("blocked"),
      blockers: v.array(archiveBlockerValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const { child, authUser } = await requireActiveChildForParent(
      ctx,
      args.childId,
    );

    const blockers = await findArchiveBlockers(ctx, child._id);
    if (blockers.length > 0) {
      return { status: "blocked" as const, blockers };
    }

    const now = Date.now();

    // Their phones stop working and open pairing codes die.
    const grants = await ctx.db
      .query("childDeviceAccessGrants")
      .withIndex("by_child", (q) => q.eq("childId", child._id))
      .take(100);
    for (const grant of grants) {
      if (grant.revokedAt === undefined) {
        await ctx.db.patch(grant._id, {
          revokedAt: now,
          revokedByAuthUserId: authUser._id,
        });
      }
    }
    const credentials = await ctx.db
      .query("childPairingCredentials")
      .withIndex("by_child", (q) => q.eq("childId", child._id))
      .take(100);
    for (const credential of credentials) {
      if (
        credential.revokedAt === undefined &&
        credential.redeemedAt === undefined
      ) {
        await ctx.db.patch(credential._id, {
          revokedAt: now,
          revokedByAuthUserId: authUser._id,
        });
      }
    }

    // Their personal chores stop generating; history keeps its snapshots.
    const definitions = await ctx.db
      .query("choreDefinitions")
      .withIndex("by_household_personal_child", (q) =>
        q.eq("householdId", child.householdId).eq("personalChildId", child._id),
      )
      .take(200);
    for (const definition of definitions) {
      if (definition.archivedAt === undefined) {
        await ctx.db.patch(definition._id, {
          archivedAt: now,
          archivedByAuthUserId: authUser._id,
          updatedAt: now,
        });
      }
    }

    await ctx.db.patch(child._id, { archivedAt: now, updatedAt: now });

    return { status: "archived" as const };
  },
});
