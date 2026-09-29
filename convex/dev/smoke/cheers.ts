import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import { sendCheer } from "../../lib/cheers/sendCheer";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/*
 * High-fives (J-11): a Child may cheer a sibling's approved win in their own
 * Household — never their own, never another Household's, never a removed
 * sibling's, never an unapproved review — once per win, carrying no money.
 */
export const run = internalMutation({
  args: {},

  returns: v.object({ passed: v.boolean() }),

  handler: async (ctx) => {
    const now = 1_893_456_000_000;
    const timezone = "Europe/Stockholm";
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

    async function win(
      householdId: Id<"households">,
      childId: Id<"children">,
      decision: "approved" | "rejected" = "approved",
    ) {
      const definitionId = await ctx.db.insert("choreDefinitions", {
        householdId,
        kind: "personal",
        title: "Feed the cat",
        valueSek: 15,
        recurrence: { kind: "one_off", scheduledDate: "2030-01-15" },
        deadlineLocalTime: "18:00",
        deadlineDayOffset: 0,
        personalChildId: childId,
        isUnlockChore: false,
        createdByAuthUserId: "cheers-smoke-parent",
        createdAt: now,
        updatedAt: now,
      });
      const occurrenceId = await ctx.db.insert("choreOccurrences", {
        householdId,
        choreDefinitionId: definitionId,
        kind: "personal",
        title: "Feed the cat",
        valueSek: 15,
        scheduledLocalDate: "2030-01-15",
        timezone,
        deadlineLocalTime: "18:00",
        deadlineDayOffset: 0,
        availabilityStartsAt: now - 60_000,
        deadlineAt: now + 3_600_000,
        personalChildId: childId,
        isUnlockChore: false,
        state: decision === "approved" ? "approved" : "redo_required",
        createdAt: now,
      });
      const submissionId = await ctx.db.insert("choreSubmissions", {
        householdId,
        occurrenceId,
        childId,
        attemptNumber: 1,
        submittedAt: now,
      });
      const reviewId = await ctx.db.insert("choreReviews", {
        householdId,
        occurrenceId,
        submissionId,
        decision,
        reviewedByAuthUserId: "cheers-smoke-parent",
        reviewedAt: now + 100,
      });
      cleanup.push(async () => {
        await ctx.db.delete(reviewId);
        await ctx.db.delete(submissionId);
        await ctx.db.delete(occurrenceId);
        await ctx.db.delete(definitionId);
      });
      return reviewId;
    }

    async function rejects(run: () => Promise<unknown>, message: string) {
      let threw = false;
      try {
        await run();
      } catch {
        threw = true;
      }
      assert(threw, message);
    }

    const homeId = await household("Cheers smoke");
    const otherId = await household("Cheers smoke (other)");
    const alexId = await child(homeId, "Alex");
    const mayaId = await child(homeId, "Maya");
    const goneId = await child(homeId, "Removed", true);
    const strangerId = await child(otherId, "Stranger");

    const home = await ctx.db.get(homeId);
    const alex = await ctx.db.get(alexId);
    assert(home && alex, "Fixture rows must exist.");
    const sender = { child: alex, household: home };

    const mayaWin = await win(homeId, mayaId);
    const alexWin = await win(homeId, alexId);
    const goneWin = await win(homeId, goneId);
    const strangerWin = await win(otherId, strangerId);
    const mayaRejected = await win(homeId, mayaId, "rejected");

    // A sibling's approved win: one cheer, from Alex to Maya.
    const first = await sendCheer(ctx, sender, mayaWin, { now, notify: false });
    assert(first.status === "sent", "A sibling's win must accept a high-five.");
    cleanup.push(() => ctx.db.delete(first.cheerId));

    const row = await ctx.db.get(first.cheerId);
    assert(
      row &&
        row.fromChildId === alexId &&
        row.toChildId === mayaId &&
        row.householdId === homeId,
      "The cheer must go from the sender to the win's owner in their Household.",
    );
    assert(
      row &&
        Object.keys(row)
          .filter((key) => !key.startsWith("_"))
          .sort()
          .join("|") ===
          ["activityId", "createdAt", "fromChildId", "householdId", "toChildId"]
            .sort()
            .join("|"),
      "A cheer must not carry money or any other fields.",
    );

    // Once per win per sender.
    const again = await sendCheer(ctx, sender, mayaWin, { now, notify: false });
    assert(
      again.status === "already_sent" && again.cheerId === first.cheerId,
      "A repeat high-five must be a no-op.",
    );

    await rejects(
      () => sendCheer(ctx, sender, alexWin, { now, notify: false }),
      "A Child must not high-five their own win.",
    );
    await rejects(
      () => sendCheer(ctx, sender, strangerWin, { now, notify: false }),
      "A Child must not high-five a win from another Household.",
    );
    await rejects(
      () => sendCheer(ctx, sender, goneWin, { now, notify: false }),
      "A removed sibling must not receive high-fives.",
    );
    await rejects(
      () => sendCheer(ctx, sender, mayaRejected, { now, notify: false }),
      "Only approved wins can be high-fived.",
    );

    for (const undo of cleanup.reverse()) {
      await undo();
    }

    return { passed: true };
  },
});
