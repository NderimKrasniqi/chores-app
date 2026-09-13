import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ensureCurrentPayoutPeriod } from "./finance/payoutPeriods";

export function normalizeHouseholdTimezone(timezone: string) {
  const trimmed = timezone.trim();

  if (!trimmed) {
    throw new ConvexError("Timezone is required.");
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
    }).resolvedOptions().timeZone;
  } catch {
    throw new ConvexError("Invalid IANA timezone.");
  }
}

export async function updateHouseholdTimezone(
  ctx: MutationCtx,
  householdId: Id<"households">,
  timezoneInput: string,
  now = Date.now(),
) {
  const timezone = normalizeHouseholdTimezone(timezoneInput);

  /*
   * Persist the current period with its existing timezone before changing
   * future Household scheduling context. Existing occurrences and payout
   * periods keep their immutable snapshots.
   */
  const currentPeriod = await ensureCurrentPayoutPeriod(ctx, householdId, now);

  await ctx.db.patch(householdId, {
    timezone,
    updatedAt: now,
  });

  return {
    householdId,
    timezone,
    currentPeriodEndAt: currentPeriod.endAt,
  };
}

export async function updateHouseholdWeeklyUnclaimAllowance(
  ctx: MutationCtx,
  householdId: Id<"households">,
  weeklyUnclaimAllowance: number,
  now = Date.now(),
) {
  if (
    !Number.isSafeInteger(weeklyUnclaimAllowance) ||
    weeklyUnclaimAllowance < 0
  ) {
    throw new ConvexError(
      "Weekly unclaim allowance must be a non-negative whole number.",
    );
  }

  await ctx.db.patch(householdId, {
    weeklyUnclaimAllowance,
    updatedAt: now,
  });

  return {
    householdId,
    weeklyUnclaimAllowance,
  };
}
