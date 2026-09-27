import { ConvexError, v } from "convex/values";

import { query } from "./_generated/server";
import { requireCurrentChildAccess } from "./lib/auth/childAuthorization";
import { requireCurrentParentForHousehold } from "./lib/auth/parentAuthorization";
import { listHouseholdApprovalActivity } from "./lib/activity/approvalActivity";

const activityItemValidator = v.object({
  activityId: v.id("choreReviews"),

  childId: v.id("children"),

  childDisplayName: v.string(),

  choreTitle: v.string(),

  choreKind: v.union(v.literal("personal"), v.literal("claimable")),

  valueSek: v.number(),

  approvedAt: v.number(),
});

const activityFeedValidator = v.object({
  timezone: v.string(),

  items: v.array(activityItemValidator),
});

/*
 * Child-facing shared social surface.
 *
 * No Child ID is accepted from the client.
 * Authentication determines the Household.
 *
 * Individual approved chore values are shared
 * by product design, but sibling balances and
 * detailed Ledger history are not returned.
 */
export const listForCurrentChild = query({
  args: {},

  returns: activityFeedValidator,

  handler: async (ctx) => {
    const { household } = await requireCurrentChildAccess(ctx);

    return {
      timezone: household.timezone,

      items: await listHouseholdApprovalActivity(ctx, household._id),
    };
  },
});

export const listForParent = query({
  args: {
    householdId: v.id("households"),
  },

  returns: activityFeedValidator,

  handler: async (ctx, args) => {
    await requireCurrentParentForHousehold(ctx, args.householdId);

    const household = await ctx.db.get(args.householdId);

    if (!household) {
      throw new ConvexError("Household not found.");
    }

    return {
      timezone: household.timezone,

      items: await listHouseholdApprovalActivity(ctx, household._id),
    };
  },
});

/*
 * The last week of wins for the Family "star shelf": one entry per approved
 * chore, no values. `now` comes from the client (rounded to the minute) so
 * the query stays cacheable; the client groups by household-local day.
 */
const WEEK_MS = 8 * 24 * 60 * 60 * 1000;
const WEEK_STAR_LIMIT = 250;

const weekStarsValidator = v.object({
  timezone: v.string(),

  stars: v.array(
    v.object({
      activityId: v.id("choreReviews"),

      childId: v.id("children"),

      childDisplayName: v.string(),

      approvedAt: v.number(),
    }),
  ),
});

async function weekStars(
  ctx: Parameters<typeof listHouseholdApprovalActivity>[0],
  householdId: Parameters<typeof listHouseholdApprovalActivity>[1],
  now: number,
) {
  const items = await listHouseholdApprovalActivity(ctx, householdId, {
    since: now - WEEK_MS,
    limit: WEEK_STAR_LIMIT,
    scanLimit: WEEK_STAR_LIMIT + 50,
  });
  return items.map((item) => ({
    activityId: item.activityId,
    childId: item.childId,
    childDisplayName: item.childDisplayName,
    approvedAt: item.approvedAt,
  }));
}

export const weekForCurrentChild = query({
  args: { now: v.number() },

  returns: weekStarsValidator,

  handler: async (ctx, args) => {
    const { household } = await requireCurrentChildAccess(ctx);

    return {
      timezone: household.timezone,

      stars: await weekStars(ctx, household._id, args.now),
    };
  },
});

export const weekForParent = query({
  args: { householdId: v.id("households"), now: v.number() },

  returns: weekStarsValidator,

  handler: async (ctx, args) => {
    await requireCurrentParentForHousehold(ctx, args.householdId);

    const household = await ctx.db.get(args.householdId);

    if (!household) {
      throw new ConvexError("Household not found.");
    }

    return {
      timezone: household.timezone,

      stars: await weekStars(ctx, household._id, args.now),
    };
  },
});
