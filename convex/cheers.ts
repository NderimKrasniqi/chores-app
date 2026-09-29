import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentChildAccess } from "./lib/auth/childAuthorization";
import { sendCheer } from "./lib/cheers/sendCheer";

/** How many recent high-fives each list returns. */
const CHEER_LIMIT = 30;

/*
 * A Child high-fives a sibling's approved chore (J-11). No Child ID is
 * accepted from the client: the sender is the signed-in Child, and the
 * recipient is whoever the approved submission belongs to. One per win per
 * sender; a repeat is a no-op. Carries no money and reveals no balance.
 */
export const send = mutation({
  args: { activityId: v.id("choreReviews") },

  returns: v.object({
    status: v.union(v.literal("sent"), v.literal("already_sent")),
  }),

  handler: async (ctx, args) => {
    const { child, household } = await requireCurrentChildAccess(ctx);
    const result = await sendCheer(ctx, { child, household }, args.activityId);
    return { status: result.status };
  },
});

/*
 * The signed-in Child's recent high-fives: the wins they already cheered
 * (so the button shows as sent) and the ones they received (for the toast).
 */
export const listMine = query({
  args: {},

  returns: v.object({
    givenActivityIds: v.array(v.id("choreReviews")),

    received: v.array(
      v.object({
        cheerId: v.id("cheers"),
        fromDisplayName: v.string(),
        choreTitle: v.string(),
        createdAt: v.number(),
      }),
    ),
  }),

  handler: async (ctx) => {
    const { child, household } = await requireCurrentChildAccess(ctx);

    const given = await ctx.db
      .query("cheers")
      .withIndex("by_fromChildId_and_createdAt", (q) =>
        q.eq("fromChildId", child._id),
      )
      .order("desc")
      .take(CHEER_LIMIT);

    const receivedRows = await ctx.db
      .query("cheers")
      .withIndex("by_toChildId_and_createdAt", (q) =>
        q.eq("toChildId", child._id),
      )
      .order("desc")
      .take(CHEER_LIMIT);

    const received = [];
    for (const row of receivedRows) {
      if (row.householdId !== household._id) continue;
      const from = await ctx.db.get(row.fromChildId);
      const review = await ctx.db.get(row.activityId);
      const occurrence = review ? await ctx.db.get(review.occurrenceId) : null;
      if (!from || !occurrence) continue;
      received.push({
        cheerId: row._id,
        fromDisplayName: from.displayName,
        choreTitle: occurrence.title,
        createdAt: row.createdAt,
      });
    }

    return {
      givenActivityIds: given
        .filter((row) => row.householdId === household._id)
        .map((row) => row.activityId),
      received,
    };
  },
});
