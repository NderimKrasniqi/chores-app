import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentChildAccess } from "./lib/auth/childAuthorization";
import { enqueueNotificationEvent } from "./lib/notifications/events";

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

    const review = await ctx.db.get(args.activityId);

    if (
      !review ||
      review.householdId !== household._id ||
      review.decision !== "approved"
    ) {
      throw new ConvexError("That win isn’t available any more.");
    }

    const submission = await ctx.db.get(review.submissionId);
    const occurrence = await ctx.db.get(review.occurrenceId);

    if (
      !submission ||
      !occurrence ||
      submission.childId === undefined ||
      submission.householdId !== household._id
    ) {
      throw new ConvexError("That win isn’t available any more.");
    }

    if (submission.childId === child._id) {
      throw new ConvexError("High-fives are for your brothers and sisters.");
    }

    const existing = await ctx.db
      .query("cheers")
      .withIndex("by_activityId_and_fromChildId", (q) =>
        q.eq("activityId", review._id).eq("fromChildId", child._id),
      )
      .unique();

    if (existing) {
      return { status: "already_sent" as const };
    }

    const now = Date.now();

    await ctx.db.insert("cheers", {
      householdId: household._id,
      activityId: review._id,
      fromChildId: child._id,
      toChildId: submission.childId,
      createdAt: now,
    });

    await enqueueNotificationEvent(
      ctx,
      {
        eventKey: `cheer:${review._id}:${child._id}`,
        kind: "cheer",
        householdId: household._id,
        recipientKind: "child",
        childId: submission.childId,
        title: `${child.displayName} high-fived you`,
        body: `For ${occurrence.title}. Nice work!`,
        occurrenceId: occurrence._id,
      },
      { now },
    );

    return { status: "sent" as const };
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
