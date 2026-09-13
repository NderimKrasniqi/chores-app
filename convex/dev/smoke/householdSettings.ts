import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import {
  updateHouseholdTimezone,
  updateHouseholdWeeklyUnclaimAllowance,
} from "../../lib/householdSettings";
import { resolveLocalDateTimeToEpochMs } from "../../lib/scheduling/choreScheduling";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectFailure(
  operation: () => Promise<unknown>,
  message: string,
) {
  try {
    await operation();
  } catch {
    return;
  }

  throw new Error(message);
}

export const run = internalMutation({
  args: {},

  returns: v.null(),

  handler: async (ctx) => {
    const now = resolveLocalDateTimeToEpochMs(
      "2030-01-16",
      "12:00",
      "Europe/Stockholm",
    );

    const householdId = await ctx.db.insert("households", {
      name: "Household settings smoke",
      timezone: "Europe/Stockholm",
      payoutWeekday: "friday",
      weeklyUnclaimAllowance: 2,
      createdAt: now,
      updatedAt: now,
    });

    await updateHouseholdTimezone(ctx, householdId, "America/New_York", now);

    await updateHouseholdWeeklyUnclaimAllowance(ctx, householdId, 1, now);

    const household = await ctx.db.get(householdId);
    const payoutPeriod = await ctx.db
      .query("payoutPeriods")
      .withIndex("by_household_start_at", (q) =>
        q.eq("householdId", householdId),
      )
      .unique();

    assert(
      household?.timezone === "America/New_York",
      "Timezone update must persist.",
    );
    assert(
      household.weeklyUnclaimAllowance === 1,
      "Weekly unclaim allowance update must persist.",
    );
    assert(
      payoutPeriod?.timezone === "Europe/Stockholm",
      "The open payout period must keep its original timezone snapshot.",
    );

    await expectFailure(
      () => updateHouseholdTimezone(ctx, householdId, "Not/A_Timezone", now),
      "Invalid IANA timezone must be rejected.",
    );

    await expectFailure(
      () => updateHouseholdWeeklyUnclaimAllowance(ctx, householdId, -1, now),
      "Negative weekly unclaim allowance must be rejected.",
    );

    return null;
  },
});
