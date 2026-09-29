import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import { countTodayProgress } from "../../lib/groundControl/todayProgress";
import { resolveLocalDateTimeToEpochMs } from "../../lib/scheduling/choreScheduling";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

type State =
  | "available"
  | "submitted"
  | "approved"
  | "redo_required"
  | "missed"
  | "cancelled";

/*
 * Ground Control's radar counts each active Child's Personal Chores for the
 * household-local day: yesterday, tomorrow, cancelled chores, removed
 * Children and other Households never count.
 */
export const run = internalMutation({
  args: {},

  returns: v.object({ passed: v.boolean() }),

  handler: async (ctx) => {
    const timezone = "Europe/Stockholm";
    // 2030-01-15 10:00 in Stockholm.
    const now = resolveLocalDateTimeToEpochMs("2030-01-15", "10:00", timezone);
    const cleanup: Array<() => Promise<void>> = [];

    async function household(name: string) {
      const id = await ctx.db.insert("households", {
        name,
        timezone,
        payoutWeekday: "friday",
        weeklyUnclaimAllowance: 2,
        createdAt: now,
        updatedAt: now,
      });
      cleanup.push(() => ctx.db.delete(id));
      return id;
    }

    async function child(
      householdId: Id<"households">,
      displayName: string,
      archived = false,
    ) {
      const id = await ctx.db.insert("children", {
        householdId,
        displayName,
        ...(archived ? { archivedAt: now } : {}),
        createdAt: now,
        updatedAt: now,
      });
      cleanup.push(() => ctx.db.delete(id));
      return id;
    }

    async function chore(
      householdId: Id<"households">,
      childId: Id<"children">,
      localDate: string,
      state: State,
    ) {
      const definitionId = await ctx.db.insert("choreDefinitions", {
        householdId,
        kind: "personal",
        title: "Tidy up",
        valueSek: 10,
        recurrence: { kind: "one_off", scheduledDate: localDate },
        deadlineLocalTime: "18:00",
        deadlineDayOffset: 0,
        personalChildId: childId,
        isUnlockChore: false,
        createdByAuthUserId: "ground-control-smoke",
        createdAt: now,
        updatedAt: now,
      });
      const occurrenceId = await ctx.db.insert("choreOccurrences", {
        householdId,
        choreDefinitionId: definitionId,
        kind: "personal",
        title: "Tidy up",
        valueSek: 10,
        scheduledLocalDate: localDate,
        timezone,
        deadlineLocalTime: "18:00",
        deadlineDayOffset: 0,
        availabilityStartsAt: resolveLocalDateTimeToEpochMs(
          localDate,
          "00:00",
          timezone,
        ),
        deadlineAt: resolveLocalDateTimeToEpochMs(localDate, "18:00", timezone),
        personalChildId: childId,
        isUnlockChore: false,
        state,
        createdAt: now,
      });
      cleanup.push(async () => {
        await ctx.db.delete(occurrenceId);
        await ctx.db.delete(definitionId);
      });
    }

    const homeId = await household("Ground Control smoke");
    const otherId = await household("Ground Control smoke (other)");
    const alexId = await child(homeId, "Alex");
    const mayaId = await child(homeId, "Maya");
    const goneId = await child(homeId, "Removed", true);
    const strangerId = await child(otherId, "Stranger");

    // Alex today: one of each state, plus a cancelled one.
    await chore(homeId, alexId, "2030-01-15", "available");
    await chore(homeId, alexId, "2030-01-15", "submitted");
    await chore(homeId, alexId, "2030-01-15", "approved");
    await chore(homeId, alexId, "2030-01-15", "approved");
    await chore(homeId, alexId, "2030-01-15", "redo_required");
    await chore(homeId, alexId, "2030-01-15", "missed");
    await chore(homeId, alexId, "2030-01-15", "cancelled");
    // Not today.
    await chore(homeId, alexId, "2030-01-14", "approved");
    await chore(homeId, alexId, "2030-01-16", "available");
    // Others.
    await chore(homeId, goneId, "2030-01-15", "available");
    await chore(otherId, strangerId, "2030-01-15", "available");

    const home = await ctx.db.get(homeId);
    assert(home, "Fixture household must exist.");
    const progress = await countTodayProgress(ctx, home, now);

    assert(
      progress.localDate === "2030-01-15",
      "Today is the household-local date.",
    );
    assert(
      progress.children.length === 2,
      "Only active Children of this Household appear.",
    );

    const alex = progress.children.find((row) => row.childId === alexId);
    assert(
      alex &&
        alex.total === 6 &&
        alex.approved === 2 &&
        alex.submitted === 1 &&
        alex.redo === 1 &&
        alex.missed === 1,
      "Alex counts only today's non-cancelled chores, by state.",
    );

    const maya = progress.children.find((row) => row.childId === mayaId);
    assert(maya && maya.total === 0, "A Child with nothing today counts 0.");

    for (const undo of cleanup.reverse()) {
      await undo();
    }

    return { passed: true };
  },
});
