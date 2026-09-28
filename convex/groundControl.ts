import { ConvexError, v } from "convex/values";

import { query } from "./_generated/server";
import { requireCurrentParentForHousehold } from "./lib/auth/parentAuthorization";
import { getLocalDateForInstant } from "./lib/scheduling/householdTime";

/** A day's quests always start within a day and a half of `now`. */
const WINDOW_MS = 36 * 60 * 60 * 1000;
const PER_CHILD_LIMIT = 60;
const CHILD_LIMIT = 20;

/*
 * Ground Control's radar: for each Child, how far through today's Personal
 * Chores they are (household-local day). Counts only — no values, no
 * balances. `now` comes from the client so the query stays cacheable.
 */
export const todayProgress = query({
  args: { householdId: v.id("households"), now: v.number() },

  returns: v.object({
    localDate: v.string(),
    children: v.array(
      v.object({
        childId: v.id("children"),
        total: v.number(),
        approved: v.number(),
        submitted: v.number(),
        redo: v.number(),
        missed: v.number(),
      }),
    ),
  }),

  handler: async (ctx, args) => {
    await requireCurrentParentForHousehold(ctx, args.householdId);

    const household = await ctx.db.get(args.householdId);
    if (!household) {
      throw new ConvexError("Household not found.");
    }

    const localDate = getLocalDateForInstant(args.now, household.timezone);

    const children = (
      await ctx.db
        .query("children")
        .withIndex("by_household", (q) => q.eq("householdId", household._id))
        .take(CHILD_LIMIT)
    ).filter((child) => child.archivedAt === undefined);

    const result = [];
    for (const child of children) {
      const occurrences = await ctx.db
        .query("choreOccurrences")
        .withIndex("by_personal_child_availability", (q) =>
          q
            .eq("personalChildId", child._id)
            .gte("availabilityStartsAt", args.now - WINDOW_MS)
            .lte("availabilityStartsAt", args.now + WINDOW_MS),
        )
        .take(PER_CHILD_LIMIT);

      const today = occurrences.filter(
        (occurrence) =>
          occurrence.householdId === household._id &&
          occurrence.scheduledLocalDate === localDate &&
          occurrence.state !== "cancelled",
      );

      result.push({
        childId: child._id,
        total: today.length,
        approved: today.filter((o) => o.state === "approved").length,
        submitted: today.filter((o) => o.state === "submitted").length,
        redo: today.filter((o) => o.state === "redo_required").length,
        missed: today.filter((o) => o.state === "missed" || o.state === "failed")
          .length,
      });
    }

    return { localDate, children: result };
  },
});
