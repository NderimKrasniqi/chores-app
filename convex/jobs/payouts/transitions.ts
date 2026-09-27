import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { closePayoutPeriod } from "../../lib/finance/payoutPeriods";

export const reconcile = internalMutation({
  args: {
    payoutPeriodId: v.id("payoutPeriods"),
  },

  returns: v.object({
    status: v.union(
      v.literal("not_due"),
      v.literal("closed"),
      v.literal("not_found"),
    ),

    payoutPeriodId: v.id("payoutPeriods"),

    nextPayoutPeriodId: v.union(v.null(), v.id("payoutPeriods")),
  }),

  handler: async (ctx, args) => {
    // The household may have been deleted (deleteEmptyHousehold) since this
    // boundary was scheduled: nothing to close.
    const period = await ctx.db.get(args.payoutPeriodId);
    if (!period || !(await ctx.db.get(period.householdId))) {
      return {
        status: "not_found" as const,
        payoutPeriodId: args.payoutPeriodId,
        nextPayoutPeriodId: null,
      };
    }
    return await closePayoutPeriod(ctx, args.payoutPeriodId);
  },
});
