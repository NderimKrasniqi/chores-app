import { ConvexError, v } from "convex/values";

import { query } from "./_generated/server";
import { requireCurrentParentForHousehold } from "./lib/auth/parentAuthorization";
import { calculateRunningBalanceForChild } from "./lib/finance/financialProjection";
import { getPayoutWindowForUsage } from "./lib/finance/payoutPeriods";

const PERIOD_ENTRY_LIMIT = 100;
const RECENT_CHORE_LIMIT = 40;
const DAY_MS = 86_400_000;

const occurrenceStateValidator = v.union(
  v.literal("scheduled"),
  v.literal("available"),
  v.literal("submitted"),
  v.literal("redo_required"),
  v.literal("approved"),
  v.literal("missed"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("expired_unclaimed"),
);

/**
 * One child's week at a glance for a Parent: balance, this payout week's
 * earnings and penalties, and their recent Personal Chores with outcomes.
 * Parents see full detail for their own household's children.
 */
export const getForParent = query({
  args: {
    childId: v.id("children"),
    now: v.number(),
  },
  returns: v.object({
    displayName: v.string(),
    timezone: v.string(),
    runningBalanceSek: v.number(),
    period: v.object({
      startLocalDate: v.string(),
      endLocalDate: v.string(),
      startAt: v.number(),
      endAt: v.number(),
    }),
    entries: v.array(
      v.object({
        kind: v.union(v.literal("earning"), v.literal("penalty")),
        amountSek: v.number(),
        createdAt: v.number(),
        choreTitle: v.union(v.string(), v.null()),
      }),
    ),
    chores: v.array(
      v.object({
        occurrenceId: v.id("choreOccurrences"),
        title: v.string(),
        valueSek: v.number(),
        deadlineAt: v.number(),
        scheduledLocalDate: v.string(),
        isUnlockChore: v.boolean(),
        state: occurrenceStateValidator,
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const child = await ctx.db.get(args.childId);
    if (!child || child.archivedAt !== undefined) {
      throw new ConvexError("Child not found.");
    }
    await requireCurrentParentForHousehold(ctx, child.householdId);
    const household = await ctx.db.get(child.householdId);
    if (!household) {
      throw new ConvexError("Household not found.");
    }

    const [period, balance] = await Promise.all([
      getPayoutWindowForUsage(ctx, household, args.now),
      calculateRunningBalanceForChild(ctx, child._id),
    ]);

    const ledger = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_child_created_at", (q) =>
        q
          .eq("childId", child._id)
          .gte("createdAt", period.startAt)
          .lt("createdAt", period.endAt),
      )
      .order("desc")
      .take(PERIOD_ENTRY_LIMIT);

    const entries = await Promise.all(
      ledger.map(async (entry) => {
        const occurrence = await ctx.db.get(entry.occurrenceId);
        return {
          kind: entry.kind,
          amountSek: entry.amountSek,
          createdAt: entry.createdAt,
          choreTitle: occurrence?.title ?? null,
        };
      }),
    );

    // Personal Chores that opened in the last week up to today.
    const recent = await ctx.db
      .query("choreOccurrences")
      .withIndex("by_personal_child_availability", (q) =>
        q
          .eq("personalChildId", child._id)
          .gte("availabilityStartsAt", args.now - 7 * DAY_MS)
          .lte("availabilityStartsAt", args.now + DAY_MS),
      )
      .order("desc")
      .take(RECENT_CHORE_LIMIT);

    return {
      displayName: child.displayName,
      timezone: household.timezone,
      runningBalanceSek: balance.balanceSek,
      period: {
        startLocalDate: period.startLocalDate,
        endLocalDate: period.endLocalDate,
        startAt: period.startAt,
        endAt: period.endAt,
      },
      entries,
      chores: recent.map((occurrence) => ({
        occurrenceId: occurrence._id,
        title: occurrence.title,
        valueSek: occurrence.valueSek,
        deadlineAt: occurrence.deadlineAt,
        scheduledLocalDate: occurrence.scheduledLocalDate,
        isUnlockChore: occurrence.isUnlockChore,
        state: occurrence.state,
      })),
    };
  },
});
