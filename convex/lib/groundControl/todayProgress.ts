import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
  addLocalDays,
  resolveLocalDateTimeToEpochMs,
} from "../scheduling/choreScheduling";
import { getLocalDateForInstant } from "../scheduling/householdTime";

const PER_CHILD_LIMIT = 100;
const CHILD_LIMIT = 20;

/*
 * Ground Control's radar: how far each active Child is through today's
 * Personal Chores (household-local day). Counts only — no values, no
 * balances. The read is bounded to the local day: an occurrence's
 * availability always falls on its scheduled local date.
 */
export async function countTodayProgress(
  ctx: QueryCtx,
  household: Doc<"households">,
  now: number,
) {
  const localDate = getLocalDateForInstant(now, household.timezone);
  const dayStart = resolveLocalDateTimeToEpochMs(
    localDate,
    "00:00",
    household.timezone,
  );
  const nextDayStart = resolveLocalDateTimeToEpochMs(
    addLocalDays(localDate, 1),
    "00:00",
    household.timezone,
  );

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
          .gte("availabilityStartsAt", dayStart)
          .lt("availabilityStartsAt", nextDayStart),
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
}
