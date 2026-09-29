import { ConvexError, v } from "convex/values";

import { query } from "./_generated/server";
import { requireCurrentParentForHousehold } from "./lib/auth/parentAuthorization";
import { countTodayProgress } from "./lib/groundControl/todayProgress";

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

    return await countTodayProgress(ctx, household, args.now);
  },
});
