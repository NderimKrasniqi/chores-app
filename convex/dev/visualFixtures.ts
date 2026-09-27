import { ConvexError, v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, internalQuery } from "../_generated/server";
import { getCurrentPayoutWeekWindow } from "../lib/claims/commitmentRules";
import { rebuildFinancialBalanceProjection } from "../lib/finance/financialProjection";
import { rejectInitialSubmission } from "../lib/reviews/initialRejection";
import { approvePersonalSubmission } from "../lib/reviews/personal";
import {
  addLocalDays,
  resolveLocalDateTimeToEpochMs,
} from "../lib/scheduling/choreScheduling";
import { getLocalDateForInstant } from "../lib/scheduling/householdTime";

const scenarioValidator = v.union(
  v.literal("parent_home"),
  v.literal("child_home"),
  v.literal("extras_pool"),
  v.literal("parent_chores"),
  v.literal("reviews_queue"),
  v.literal("money_overview"),
  v.literal("activity_history"),
  v.literal("activity_empty"),
  v.literal("child_money_positive"),
  v.literal("child_money_zero"),
  v.literal("child_money_negative"),
);

type Scenario =
  | "parent_home"
  | "child_home"
  | "extras_pool"
  | "parent_chores"
  | "reviews_queue"
  | "money_overview"
  | "activity_history"
  | "activity_empty"
  | "child_money_positive"
  | "child_money_zero"
  | "child_money_negative";

type FixtureContext = {
  householdId: Id<"households">;
  parentAuthUserId: string;
  alexId: Id<"children">;
  mayaId: Id<"children">;
  timezone: string;
  now: number;
  today: string;
};

const EXPECTED_HOUSEHOLD_NAME = "Krasniqi Family";
const ADDITIONAL_VISUAL_HOUSEHOLD_NAMES = new Set(["Visual Parity Household"]);
const ALEX_VISUAL_PAIRING_CODE = "ALEX26";
const ALEX_VISUAL_PAIRING_CODE_HASH =
  "f0d56856d5ec2716457e8c5570fb9814cfe2013c2ef67b075f95cf096f8d9082";
const ALEX_VISUAL_QR_TOKEN_HASH =
  "3bd8dda1191f37fd15b237423bcad46d0c1d84ecc2daee87dbd92058a5482c80";
const MAYA_VISUAL_PAIRING_CODE = "MAYA26";
const MAYA_VISUAL_PAIRING_CODE_HASH =
  "601289d0b6702ce38766dcb39393996122c97313ac40c16a88e5d85ce5395193";
const MAYA_VISUAL_QR_TOKEN_HASH =
  "90b84a337578d97607a8b924e9a59c6191c4acb4ff3d444f68fe651fb9430cd1";

function assertDevelopmentOnly() {
  if (process.env.APP_ENV === "production") {
    throw new ConvexError("Visual fixtures are disabled in production.");
  }
}

async function loadFixtureContext(
  ctx: MutationCtx | QueryCtx,
  householdId: Id<"households">,
  expectedParentAuthUserId: string,
): Promise<FixtureContext> {
  assertDevelopmentOnly();

  const household = await ctx.db.get(householdId);
  if (
    !household ||
    (household.name !== EXPECTED_HOUSEHOLD_NAME &&
      !ADDITIONAL_VISUAL_HOUSEHOLD_NAMES.has(household.name))
  ) {
    throw new ConvexError("Refusing to seed an unexpected Household.");
  }

  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_household_auth_user", (q) =>
      q
        .eq("householdId", householdId)
        .eq("authUserId", expectedParentAuthUserId),
    )
    .unique();
  if (!membership) {
    throw new ConvexError("Expected visual-test Parent membership not found.");
  }

  const children = await ctx.db
    .query("children")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();
  const alex = children.find((child) => child.displayName === "Alex");
  const maya = children.find((child) => child.displayName === "Maya");
  if (!alex || !maya || children.length !== 2) {
    throw new ConvexError(
      "Visual-test Household must contain exactly Alex and Maya.",
    );
  }

  const now = Date.now();
  return {
    householdId,
    parentAuthUserId: expectedParentAuthUserId,
    alexId: alex._id,
    mayaId: maya._id,
    timezone: household.timezone,
    now,
    today: getLocalDateForInstant(now, household.timezone),
  };
}

export const alignVisualHouseholdNameWithReference = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({ name: v.string(), updated: v.boolean() }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const household = await ctx.db.get(fixture.householdId);
    if (!household) {
      throw new ConvexError("Visual-test Household was not found.");
    }

    if (household.name === EXPECTED_HOUSEHOLD_NAME) {
      return { name: household.name, updated: false };
    }
    if (!ADDITIONAL_VISUAL_HOUSEHOLD_NAMES.has(household.name)) {
      throw new ConvexError(
        "Refusing to rename an unexpected visual-test Household.",
      );
    }

    await ctx.db.patch("households", fixture.householdId, {
      name: EXPECTED_HOUSEHOLD_NAME,
      updatedAt: Date.now(),
    });
    return { name: EXPECTED_HOUSEHOLD_NAME, updated: true };
  },
});

async function deleteAll<T extends { _id: Id<any> }>(
  ctx: MutationCtx,
  documents: T[],
) {
  for (const document of documents) await ctx.db.delete(document._id);
}

async function resetVisualData(ctx: MutationCtx, fixture: FixtureContext) {
  const { householdId } = fixture;

  await deleteAll(
    ctx,
    await ctx.db
      .query("childFinancialBalances")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db
      .query("payouts")
      .withIndex("by_household_created_at", (q) =>
        q.eq("householdId", householdId),
      )
      .collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db
      .query("payoutPeriods")
      .withIndex("by_household_start_at", (q) =>
        q.eq("householdId", householdId),
      )
      .collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db
      .query("ledgerEntries")
      .withIndex("by_household_created_at", (q) =>
        q.eq("householdId", householdId),
      )
      .collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db
      .query("choreReviews")
      .withIndex("by_household_reviewed_at", (q) =>
        q.eq("householdId", householdId),
      )
      .collect(),
  );
  const submissions = await ctx.db
    .query("choreSubmissions")
    .withIndex("by_household_submitted_at", (q) =>
      q.eq("householdId", householdId),
    )
    .collect();
  for (const submission of submissions) {
    if (submission.evidenceStorageId) {
      try {
        await ctx.storage.delete(submission.evidenceStorageId);
      } catch {
        // A previous fixture cleanup may already have removed the object.
      }
    }
  }
  await deleteAll(ctx, submissions);
  await deleteAll(
    ctx,
    await ctx.db
      .query("choreRedos")
      .withIndex("by_household_deadline", (q) =>
        q.eq("householdId", householdId),
      )
      .collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db
      .query("choreClaims")
      .withIndex("by_household_claimed_at", (q) =>
        q.eq("householdId", householdId),
      )
      .collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db
      .query("choreOccurrences")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db
      .query("choreDefinitions")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect(),
  );
}

function at(fixture: FixtureContext, date: string, time: string) {
  return resolveLocalDateTimeToEpochMs(date, time, fixture.timezone);
}

async function createPersonalDefinition(
  ctx: MutationCtx,
  fixture: FixtureContext,
  input: {
    childId: Id<"children">;
    title: string;
    valueSek: number;
    deadlineLocalTime: string;
    availabilityLocalTime?: string;
    isUnlockChore?: boolean;
    description?: string;
    recurrence?:
      | { kind: "one_off"; scheduledDate: string }
      | { kind: "daily"; startDate: string; interval: number }
      | {
          kind: "weekly";
          startDate: string;
          interval: number;
          weekdays: (
            "monday" | "tuesday" | "wednesday" | "thursday" | "friday"
          )[];
        };
  },
) {
  return await ctx.db.insert("choreDefinitions", {
    householdId: fixture.householdId,
    kind: "personal",
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    valueSek: input.valueSek,
    recurrence: input.recurrence ?? {
      kind: "daily",
      startDate: fixture.today,
      interval: 1,
    },
    availabilityLocalTime: input.availabilityLocalTime ?? "00:00",
    deadlineLocalTime: input.deadlineLocalTime,
    deadlineDayOffset: 0,
    personalChildId: input.childId,
    isUnlockChore: input.isUnlockChore ?? false,
    createdByAuthUserId: fixture.parentAuthUserId,
    createdAt: fixture.now - 86_400_000,
    updatedAt: fixture.now - 86_400_000,
  });
}

async function createClaimableDefinition(
  ctx: MutationCtx,
  fixture: FixtureContext,
  input: {
    title: string;
    valueSek: number;
    scheduledDate: string;
    availabilityLocalTime: string;
    deadlineLocalTime: string;
    deadlineDayOffset?: number;
    description?: string;
  },
) {
  return await ctx.db.insert("choreDefinitions", {
    householdId: fixture.householdId,
    kind: "claimable",
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    valueSek: input.valueSek,
    recurrence: { kind: "one_off", scheduledDate: input.scheduledDate },
    availabilityLocalTime: input.availabilityLocalTime,
    deadlineLocalTime: input.deadlineLocalTime,
    deadlineDayOffset: input.deadlineDayOffset ?? 0,
    eligibleChildIds: [fixture.alexId, fixture.mayaId],
    isUnlockChore: false,
    createdByAuthUserId: fixture.parentAuthUserId,
    createdAt: fixture.now - 86_400_000,
    updatedAt: fixture.now - 86_400_000,
  });
}

async function createOccurrence(
  ctx: MutationCtx,
  fixture: FixtureContext,
  input: {
    definitionId: Id<"choreDefinitions">;
    kind: "personal" | "claimable";
    title: string;
    valueSek: number;
    date?: string;
    availabilityLocalTime?: string;
    deadlineLocalTime: string;
    deadlineDayOffset?: number;
    state:
      | "scheduled"
      | "available"
      | "submitted"
      | "redo_required"
      | "approved"
      | "missed"
      | "failed"
      | "expired_unclaimed";
    childId?: Id<"children">;
    isUnlockChore?: boolean;
    description?: string;
    activated?: boolean;
  },
) {
  const date = input.date ?? fixture.today;
  const availabilityLocalTime = input.availabilityLocalTime ?? "00:00";
  const deadlineDayOffset = input.deadlineDayOffset ?? 0;
  const availabilityStartsAt = at(fixture, date, availabilityLocalTime);
  return await ctx.db.insert("choreOccurrences", {
    householdId: fixture.householdId,
    choreDefinitionId: input.definitionId,
    kind: input.kind,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    valueSek: input.valueSek,
    scheduledLocalDate: date,
    timezone: fixture.timezone,
    availabilityLocalTime,
    deadlineLocalTime: input.deadlineLocalTime,
    deadlineDayOffset,
    availabilityStartsAt,
    ...(input.activated === false
      ? {}
      : { availabilityReachedAt: availabilityStartsAt }),
    deadlineAt: at(
      fixture,
      addLocalDays(date, deadlineDayOffset),
      input.deadlineLocalTime,
    ),
    ...(input.kind === "personal"
      ? { personalChildId: input.childId }
      : { eligibleChildIds: [fixture.alexId, fixture.mayaId] }),
    isUnlockChore: input.isUnlockChore ?? false,
    state: input.state,
    createdAt: fixture.now - 43_200_000,
  });
}

async function createPendingSubmission(
  ctx: MutationCtx,
  fixture: FixtureContext,
  occurrenceId: Id<"choreOccurrences">,
  childId: Id<"children">,
  submittedAt: number,
  evidenceStorageId?: Id<"_storage">,
) {
  return await ctx.db.insert("choreSubmissions", {
    householdId: fixture.householdId,
    occurrenceId,
    childId,
    attemptNumber: 1,
    submittedAt,
    ...(evidenceStorageId ? { evidenceStorageId } : {}),
  });
}

async function createApprovedHistory(
  ctx: MutationCtx,
  fixture: FixtureContext,
  input: {
    childId: Id<"children">;
    title: string;
    valueSek: number;
    reviewedAt: number;
    kind?: "personal" | "claimable";
  },
) {
  const date = getLocalDateForInstant(input.reviewedAt, fixture.timezone);
  const kind = input.kind ?? "personal";
  const definitionId =
    kind === "personal"
      ? await createPersonalDefinition(ctx, fixture, {
          childId: input.childId,
          title: input.title,
          valueSek: input.valueSek,
          deadlineLocalTime: "18:00",
        })
      : await createClaimableDefinition(ctx, fixture, {
          title: input.title,
          valueSek: input.valueSek,
          scheduledDate: date,
          availabilityLocalTime: "00:00",
          deadlineLocalTime: "18:00",
        });
  const occurrenceId = await createOccurrence(ctx, fixture, {
    definitionId,
    kind,
    title: input.title,
    valueSek: input.valueSek,
    date,
    deadlineLocalTime: "18:00",
    state: "approved",
    ...(kind === "personal" ? { childId: input.childId } : {}),
  });
  if (kind === "claimable") {
    await ctx.db.insert("choreClaims", {
      householdId: fixture.householdId,
      occurrenceId,
      childId: input.childId,
      state: "approved",
      claimedAt: input.reviewedAt - 3_600_000,
    });
  }
  const submissionId = await createPendingSubmission(
    ctx,
    fixture,
    occurrenceId,
    input.childId,
    input.reviewedAt - 60_000,
  );
  const reviewId = await ctx.db.insert("choreReviews", {
    householdId: fixture.householdId,
    occurrenceId,
    submissionId,
    decision: "approved",
    reviewedByAuthUserId: fixture.parentAuthUserId,
    reviewedAt: input.reviewedAt,
  });
  await ctx.db.insert("ledgerEntries", {
    householdId: fixture.householdId,
    childId: input.childId,
    occurrenceId,
    reviewId,
    kind: "earning",
    amountSek: input.valueSek,
    createdAt: input.reviewedAt,
  });
}

async function setBalance(
  ctx: MutationCtx,
  fixture: FixtureContext,
  childId: Id<"children">,
  earningTotalSek: number,
  penaltyTotalSek = 0,
  settledTotalSek = 0,
  entryCount = 1,
) {
  await ctx.db.insert("childFinancialBalances", {
    householdId: fixture.householdId,
    childId,
    earningTotalSek,
    penaltyTotalSek,
    settledTotalSek,
    entryCount,
    updatedAt: fixture.now,
  });
}

function previousLocalWeekday(today: string, weekday: number) {
  const currentWeekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const daysAgo = (currentWeekday - weekday + 7) % 7 || 7;
  return addLocalDays(today, -daysAgo);
}

async function seedBalancesAndActivity(
  ctx: MutationCtx,
  fixture: FixtureContext,
  useApprovedActivityWeekdays = false,
) {
  const wednesday = useApprovedActivityWeekdays
    ? previousLocalWeekday(fixture.today, 3)
    : addLocalDays(fixture.today, -5);
  const thursday = useApprovedActivityWeekdays
    ? previousLocalWeekday(fixture.today, 4)
    : addLocalDays(fixture.today, -4);
  await createApprovedHistory(ctx, fixture, {
    childId: fixture.mayaId,
    title: "Set the table",
    valueSek: 15,
    reviewedAt: at(fixture, fixture.today, "08:14"),
  });
  await createApprovedHistory(ctx, fixture, {
    childId: fixture.alexId,
    title: "Walk the dog",
    valueSek: 20,
    reviewedAt: at(fixture, fixture.today, "07:42"),
    kind: "claimable",
  });
  await createApprovedHistory(ctx, fixture, {
    childId: fixture.alexId,
    title: "Load dishwasher",
    valueSek: 25,
    reviewedAt: at(fixture, thursday, "18:06"),
  });
  await createApprovedHistory(ctx, fixture, {
    childId: fixture.mayaId,
    title: "Fold laundry",
    valueSek: 10,
    reviewedAt: at(fixture, wednesday, "17:31"),
  });
  await setBalance(ctx, fixture, fixture.alexId, 240, 0, 0, 2);
  await setBalance(ctx, fixture, fixture.mayaId, 110, 0, 0, 2);
}

async function createPendingPersonal(
  ctx: MutationCtx,
  fixture: FixtureContext,
  input: {
    childId: Id<"children">;
    title: string;
    valueSek: number;
    deadline: string;
    submitted: string;
    unlock?: boolean;
    evidenceStorageId?: Id<"_storage">;
    description?: string;
  },
) {
  const definitionId = await createPersonalDefinition(ctx, fixture, {
    childId: input.childId,
    title: input.title,
    valueSek: input.valueSek,
    deadlineLocalTime: input.deadline,
    isUnlockChore: input.unlock,
    description: input.description,
  });
  const occurrenceId = await createOccurrence(ctx, fixture, {
    definitionId,
    kind: "personal",
    title: input.title,
    valueSek: input.valueSek,
    deadlineLocalTime: input.deadline,
    state: "submitted",
    childId: input.childId,
    isUnlockChore: input.unlock,
    description: input.description,
  });
  await createPendingSubmission(
    ctx,
    fixture,
    occurrenceId,
    input.childId,
    at(fixture, fixture.today, input.submitted),
    input.evidenceStorageId,
  );
  return occurrenceId;
}

async function seedParentHome(ctx: MutationCtx, fixture: FixtureContext) {
  await seedBalancesAndActivity(ctx, fixture);
  await createPendingPersonal(ctx, fixture, {
    childId: fixture.alexId,
    title: "Clean your room",
    valueSek: 30,
    deadline: "18:00",
    submitted: "17:42",
    unlock: true,
  });
  await createPendingPersonal(ctx, fixture, {
    childId: fixture.mayaId,
    title: "Take out recycling",
    valueSek: 20,
    deadline: "20:00",
    submitted: "18:05",
  });

  const definitionId = await createClaimableDefinition(ctx, fixture, {
    title: "Walk the dog",
    valueSek: 25,
    scheduledDate: fixture.today,
    availabilityLocalTime: "08:00",
    deadlineLocalTime: "18:00",
  });
  const occurrenceId = await createOccurrence(ctx, fixture, {
    definitionId,
    kind: "claimable",
    title: "Walk the dog",
    valueSek: 25,
    availabilityLocalTime: "08:00",
    deadlineLocalTime: "18:00",
    state: "available",
  });
  await ctx.db.insert("choreClaims", {
    householdId: fixture.householdId,
    occurrenceId,
    childId: fixture.alexId,
    state: "claimed",
    claimedAt: fixture.now - 30 * 60_000,
  });
}

async function seedChildHome(ctx: MutationCtx, fixture: FixtureContext) {
  await setBalance(ctx, fixture, fixture.alexId, 240, 0, 0, 2);
  await setBalance(ctx, fixture, fixture.mayaId, 110, 0, 0, 2);
  const chores = [
    {
      title: "Clean your room",
      valueSek: 30,
      deadline: "18:00",
      state: "available" as const,
      unlock: true,
    },
    {
      title: "Feed the dog",
      valueSek: 10,
      deadline: "20:00",
      state: "available" as const,
      unlock: false,
    },
    {
      title: "Take out recycling",
      valueSek: 20,
      deadline: "21:00",
      state: "submitted" as const,
      unlock: false,
    },
  ];

  for (const chore of chores) {
    const definitionId = await createPersonalDefinition(ctx, fixture, {
      childId: fixture.alexId,
      title: chore.title,
      valueSek: chore.valueSek,
      deadlineLocalTime: chore.deadline,
      isUnlockChore: chore.unlock,
      recurrence: { kind: "one_off", scheduledDate: fixture.today },
    });
    const occurrenceId = await createOccurrence(ctx, fixture, {
      definitionId,
      kind: "personal",
      title: chore.title,
      valueSek: chore.valueSek,
      deadlineLocalTime: chore.deadline,
      state: chore.state,
      childId: fixture.alexId,
      isUnlockChore: chore.unlock,
    });
    if (chore.state === "submitted") {
      await createPendingSubmission(
        ctx,
        fixture,
        occurrenceId,
        fixture.alexId,
        fixture.now - 15 * 60_000,
      );
    }
  }
}

async function seedClaimableExtras(ctx: MutationCtx, fixture: FixtureContext) {
  const extras = [
    {
      title: "Wash the car",
      valueSek: 50,
      availability: "00:00",
      deadline: "17:30",
      deadlineDayOffset: 0,
      description: "Wash the outside of the car and put the bucket away.",
    },
    {
      title: "Fold the laundry",
      valueSek: 20,
      availability: "00:00",
      deadline: "19:00",
      deadlineDayOffset: 0,
      description: "Fold the clean laundry and put it in the right rooms.",
    },
    {
      title: "Water the plants",
      valueSek: 15,
      availability: "00:00",
      deadline: "18:00",
      deadlineDayOffset: 1,
      description: "Give the plants enough water and wipe up any spills.",
    },
    {
      title: "Set the table",
      valueSek: 15,
      availability: "00:00",
      deadline: "18:30",
      deadlineDayOffset: 0,
      description: "Put out plates, glasses, and cutlery for everyone.",
    },
  ] as const;
  for (const chore of extras) {
    const definitionId = await createClaimableDefinition(ctx, fixture, {
      title: chore.title,
      valueSek: chore.valueSek,
      scheduledDate: fixture.today,
      availabilityLocalTime: chore.availability,
      deadlineLocalTime: chore.deadline,
      deadlineDayOffset: chore.deadlineDayOffset,
      description: chore.description,
    });
    const occurrenceId = await createOccurrence(ctx, fixture, {
      definitionId,
      kind: "claimable",
      title: chore.title,
      valueSek: chore.valueSek,
      date: fixture.today,
      availabilityLocalTime: chore.availability,
      deadlineLocalTime: chore.deadline,
      deadlineDayOffset: chore.deadlineDayOffset,
      state: "available",
      description: chore.description,
    });
    if (chore.title === "Set the table") {
      await ctx.db.insert("choreClaims", {
        householdId: fixture.householdId,
        occurrenceId,
        childId: fixture.mayaId,
        state: "claimed",
        claimedAt: fixture.now - 20 * 60_000,
      });
    }
  }

  const usageDefinitionId = await createClaimableDefinition(ctx, fixture, {
    title: "Previous extra",
    valueSek: 5,
    scheduledDate: fixture.today,
    availabilityLocalTime: "00:00",
    deadlineLocalTime: "05:00",
  });
  const usageOccurrenceId = await createOccurrence(ctx, fixture, {
    definitionId: usageDefinitionId,
    kind: "claimable",
    title: "Previous extra",
    valueSek: 5,
    deadlineLocalTime: "05:00",
    state: "expired_unclaimed",
  });
  await ctx.db.insert("choreClaims", {
    householdId: fixture.householdId,
    occurrenceId: usageOccurrenceId,
    childId: fixture.alexId,
    state: "unclaimed",
    claimedAt: fixture.now - 2 * 60 * 60_000,
    unclaimedAt: fixture.now - 90 * 60_000,
  });

  return extras.length;
}

async function seedExtrasPool(ctx: MutationCtx, fixture: FixtureContext) {
  await setBalance(ctx, fixture, fixture.alexId, 240);
  await setBalance(ctx, fixture, fixture.mayaId, 110);

  const unlockDefinitionId = await createPersonalDefinition(ctx, fixture, {
    childId: fixture.alexId,
    title: "Clean your room",
    valueSek: 30,
    deadlineLocalTime: "18:00",
    isUnlockChore: true,
  });
  await createOccurrence(ctx, fixture, {
    definitionId: unlockDefinitionId,
    kind: "personal",
    title: "Clean your room",
    valueSek: 30,
    deadlineLocalTime: "18:00",
    state: "approved",
    childId: fixture.alexId,
    isUnlockChore: true,
  });

  await seedClaimableExtras(ctx, fixture);
}

async function seedParentChores(ctx: MutationCtx, fixture: FixtureContext) {
  await createPersonalDefinition(ctx, fixture, {
    childId: fixture.alexId,
    title: "Clean your room",
    valueSek: 30,
    deadlineLocalTime: "18:00",
    isUnlockChore: true,
  });
  await createPersonalDefinition(ctx, fixture, {
    childId: fixture.alexId,
    title: "Feed the dog",
    valueSek: 10,
    deadlineLocalTime: "20:00",
  });
  await createPersonalDefinition(ctx, fixture, {
    childId: fixture.mayaId,
    title: "Set the table",
    valueSek: 15,
    availabilityLocalTime: "16:00",
    deadlineLocalTime: "18:30",
    recurrence: {
      kind: "weekly",
      startDate: fixture.today,
      interval: 1,
      weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
  });
}

async function seedReviewsQueue(
  ctx: MutationCtx,
  fixture: FixtureContext,
  evidenceStorageId?: Id<"_storage">,
) {
  await createPendingPersonal(ctx, fixture, {
    childId: fixture.alexId,
    title: "Clean your room",
    valueSek: 30,
    deadline: "18:00",
    submitted: "17:42",
    unlock: true,
    evidenceStorageId,
    description: "Put clothes away, make the bed, and clear the floor.",
  });

  const definitionId = await createClaimableDefinition(ctx, fixture, {
    title: "Take out recycling",
    valueSek: 20,
    scheduledDate: fixture.today,
    availabilityLocalTime: "08:00",
    deadlineLocalTime: "20:30",
  });
  const occurrenceId = await createOccurrence(ctx, fixture, {
    definitionId,
    kind: "claimable",
    title: "Take out recycling",
    valueSek: 20,
    availabilityLocalTime: "08:00",
    deadlineLocalTime: "20:30",
    state: "submitted",
  });
  await ctx.db.insert("choreClaims", {
    householdId: fixture.householdId,
    occurrenceId,
    childId: fixture.mayaId,
    state: "submitted",
    claimedAt: fixture.now - 60 * 60_000,
  });
  await createPendingSubmission(
    ctx,
    fixture,
    occurrenceId,
    fixture.mayaId,
    at(fixture, fixture.today, "18:05"),
  );
}

async function reviewsQueueEvidenceSubmission(
  ctx: MutationCtx | QueryCtx,
  fixture: FixtureContext,
) {
  const definitions = await ctx.db
    .query("choreDefinitions")
    .withIndex("by_household_personal_child", (q) =>
      q
        .eq("householdId", fixture.householdId)
        .eq("personalChildId", fixture.alexId),
    )
    .order("desc")
    .take(100);
  const matchingDefinitions = definitions.filter(
    (definition) =>
      definition.kind === "personal" && definition.title === "Clean your room",
  );
  if (matchingDefinitions.length === 0) return null;
  if (matchingDefinitions.length !== 1) {
    throw new ConvexError(
      "Expected exactly one Alex Clean your room visual definition.",
    );
  }

  const occurrence = await ctx.db
    .query("choreOccurrences")
    .withIndex("by_definition_scheduled_date", (q) =>
      q
        .eq("choreDefinitionId", matchingDefinitions[0]._id)
        .eq("scheduledLocalDate", fixture.today),
    )
    .unique();
  if (
    !occurrence ||
    occurrence.title !== "Clean your room" ||
    occurrence.kind !== "personal" ||
    occurrence.state !== "submitted" ||
    occurrence.personalChildId !== fixture.alexId
  ) {
    throw new ConvexError(
      "Expected Alex's submitted Clean your room visual occurrence.",
    );
  }

  const submission = await ctx.db
    .query("choreSubmissions")
    .withIndex("by_occurrence_attempt", (q) =>
      q.eq("occurrenceId", occurrence._id).eq("attemptNumber", 1),
    )
    .unique();
  if (!submission || submission.householdId !== fixture.householdId) {
    throw new ConvexError(
      "Expected exactly one first-attempt Clean your room submission.",
    );
  }
  return submission;
}

async function seedMoney(
  ctx: MutationCtx,
  fixture: FixtureContext,
  mode: "positive" | "zero" | "negative",
) {
  const window = getCurrentPayoutWeekWindow({
    now: fixture.now,
    timezone: fixture.timezone,
    payoutWeekday: "friday",
  });
  // Keep the approved Money references deterministic while retaining current
  // timestamps so the real Child-authenticated payout query resolves this
  // seeded open period on any screenshot date.
  const visualYear = new Date(fixture.now).getUTCFullYear();
  const currentStartLocalDate = `${visualYear}-09-12`;
  const currentEndLocalDate = `${visualYear}-09-18`;
  const previousStartLocalDate = `${visualYear}-09-05`;
  const previousEndLocalDate = `${visualYear}-09-11`;
  const currentPeriodId = await ctx.db.insert("payoutPeriods", {
    householdId: fixture.householdId,
    ...window,
    startLocalDate: currentStartLocalDate,
    endLocalDate: currentEndLocalDate,
    state: "open",
    createdAt: fixture.now,
  });
  void currentPeriodId;

  const previousPeriodId = await ctx.db.insert("payoutPeriods", {
    householdId: fixture.householdId,
    startLocalDate: previousStartLocalDate,
    endLocalDate: previousEndLocalDate,
    startAt: window.startAt - 7 * 86_400_000,
    endAt: window.startAt,
    timezone: fixture.timezone,
    payoutWeekday: "friday",
    state: "closed",
    createdAt: window.startAt - 7 * 86_400_000,
    closedAt: window.startAt,
  });

  if (mode === "positive") {
    await setBalance(ctx, fixture, fixture.alexId, 240);
    await setBalance(ctx, fixture, fixture.mayaId, 160, 0, 50);
    await ctx.db.insert("payouts", {
      householdId: fixture.householdId,
      payoutPeriodId: previousPeriodId,
      childId: fixture.alexId,
      balanceAtCloseSek: 70,
      amountDueSek: 70,
      pendingOutcomeCount: 1,
      status: "pending",
      createdAt: window.startAt + 1,
    });
    await ctx.db.insert("payouts", {
      householdId: fixture.householdId,
      payoutPeriodId: previousPeriodId,
      childId: fixture.mayaId,
      balanceAtCloseSek: 50,
      amountDueSek: 50,
      pendingOutcomeCount: 0,
      status: "paid",
      createdAt: window.startAt + 2,
      paidAt: window.startAt + 60_000,
      paidByAuthUserId: fixture.parentAuthUserId,
    });
    return;
  }

  const balance = mode === "negative" ? -40 : 0;
  await setBalance(
    ctx,
    fixture,
    fixture.alexId,
    0,
    mode === "negative" ? -40 : 0,
    0,
  );
  await setBalance(ctx, fixture, fixture.mayaId, 0);
  await ctx.db.insert("payouts", {
    householdId: fixture.householdId,
    payoutPeriodId: previousPeriodId,
    childId: fixture.alexId,
    balanceAtCloseSek: balance,
    amountDueSek: 0,
    pendingOutcomeCount: 0,
    status: "no_payment",
    createdAt: window.startAt + 1,
  });
}

async function seedScenarioData(
  ctx: MutationCtx,
  fixture: FixtureContext,
  scenario: Scenario,
) {
  switch (scenario) {
    case "parent_home":
      return await seedParentHome(ctx, fixture);
    case "child_home":
      return await seedChildHome(ctx, fixture);
    case "extras_pool":
      return await seedExtrasPool(ctx, fixture);
    case "parent_chores":
      return await seedParentChores(ctx, fixture);
    case "reviews_queue":
      return await seedReviewsQueue(ctx, fixture);
    case "money_overview":
    case "child_money_positive":
      return await seedMoney(ctx, fixture, "positive");
    case "child_money_zero":
      return await seedMoney(ctx, fixture, "zero");
    case "child_money_negative":
      return await seedMoney(ctx, fixture, "negative");
    case "activity_history":
      return await seedBalancesAndActivity(ctx, fixture, true);
    case "activity_empty":
      await setBalance(ctx, fixture, fixture.alexId, 0, 0, 0, 0);
      return await setBalance(ctx, fixture, fixture.mayaId, 0, 0, 0, 0);
  }
}

export const seed = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
    scenario: scenarioValidator,
  },
  returns: v.object({
    scenario: scenarioValidator,
    householdId: v.id("households"),
    alexId: v.id("children"),
    mayaId: v.id("children"),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    await resetVisualData(ctx, fixture);
    await seedScenarioData(ctx, fixture, args.scenario);
    return {
      scenario: args.scenario,
      householdId: fixture.householdId,
      alexId: fixture.alexId,
      mayaId: fixture.mayaId,
    };
  },
});

/**
 * Create a normal one-use pairing credential for Maya so screenshot runs can
 * redeem it through the production anonymous-device flow and choose a fresh
 * local PIN. Only the guarded development Household can use this operation.
 */
export const createMayaPairingCredential = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    childId: v.id("children"),
    manualCode: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );

    const existingCredentials = await ctx.db
      .query("childPairingCredentials")
      .withIndex("by_child", (q) => q.eq("childId", fixture.mayaId))
      .collect();

    // This visual-test helper intentionally reuses a fixed manual-code hash.
    // Remove redeemed credentials too so the production lookup's unique()
    // invariant remains true across repeated screenshot runs.
    await deleteAll(ctx, existingCredentials);

    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000;

    // The fixed code is a valid real code now, so clear any other holder of
    // its hash to keep redemption's unique() lookup safe.
    await deleteAll(
      ctx,
      await ctx.db
        .query("childPairingCredentials")
        .withIndex("by_manual_code_hash", (q) =>
          q.eq("manualCodeHash", MAYA_VISUAL_PAIRING_CODE_HASH),
        )
        .take(10),
    );

    await ctx.db.insert("childPairingCredentials", {
      householdId: fixture.householdId,
      childId: fixture.mayaId,
      qrTokenHash: MAYA_VISUAL_QR_TOKEN_HASH,
      manualCodeHash: MAYA_VISUAL_PAIRING_CODE_HASH,
      createdByAuthUserId: fixture.parentAuthUserId,
      createdAt: now,
      expiresAt,
      manualAttemptCount: 0,
    });

    return {
      childId: fixture.mayaId,
      manualCode: MAYA_VISUAL_PAIRING_CODE,
      expiresAt,
    };
  },
});

/**
 * Create a normal one-use pairing credential for Alex so the approved Child
 * Home fixture can be exercised through the production anonymous-device flow.
 * Only the guarded development Household can use this operation.
 */
export const createAlexPairingCredential = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    childId: v.id("children"),
    manualCode: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );

    const existingCredentials = await ctx.db
      .query("childPairingCredentials")
      .withIndex("by_child", (q) => q.eq("childId", fixture.alexId))
      .collect();

    // The fixed visual-test hash must remain unique for production lookup.
    await deleteAll(ctx, existingCredentials);

    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000;

    // The fixed code is a valid real code now, so clear any other holder of
    // its hash to keep redemption's unique() lookup safe.
    await deleteAll(
      ctx,
      await ctx.db
        .query("childPairingCredentials")
        .withIndex("by_manual_code_hash", (q) =>
          q.eq("manualCodeHash", ALEX_VISUAL_PAIRING_CODE_HASH),
        )
        .take(10),
    );

    await ctx.db.insert("childPairingCredentials", {
      householdId: fixture.householdId,
      childId: fixture.alexId,
      qrTokenHash: ALEX_VISUAL_QR_TOKEN_HASH,
      manualCodeHash: ALEX_VISUAL_PAIRING_CODE_HASH,
      createdByAuthUserId: fixture.parentAuthUserId,
      createdAt: now,
      expiresAt,
      manualAttemptCount: 0,
    });

    return {
      childId: fixture.alexId,
      manualCode: ALEX_VISUAL_PAIRING_CODE,
      expiresAt,
    };
  },
});

/**
 * Add the approved Activity visual fixture to an otherwise-empty fixture
 * household without clearing any records. This is intentionally narrower
 * than `seed` so screenshot verification can trigger the reactive
 * celebration without a destructive reset.
 */
export const seedActivityHistoryIfEmpty = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    householdId: v.id("households"),
    insertedReviews: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const [definitions, occurrences, submissions, reviews, claims, entries] =
      await Promise.all([
        ctx.db
          .query("choreDefinitions")
          .withIndex("by_household", (q) =>
            q.eq("householdId", fixture.householdId),
          )
          .collect(),
        ctx.db
          .query("choreOccurrences")
          .withIndex("by_household", (q) =>
            q.eq("householdId", fixture.householdId),
          )
          .collect(),
        ctx.db
          .query("choreSubmissions")
          .withIndex("by_household_submitted_at", (q) =>
            q.eq("householdId", fixture.householdId),
          )
          .collect(),
        ctx.db
          .query("choreReviews")
          .withIndex("by_household_reviewed_at", (q) =>
            q.eq("householdId", fixture.householdId),
          )
          .collect(),
        ctx.db
          .query("choreClaims")
          .withIndex("by_household_claimed_at", (q) =>
            q.eq("householdId", fixture.householdId),
          )
          .collect(),
        ctx.db
          .query("ledgerEntries")
          .withIndex("by_household_created_at", (q) =>
            q.eq("householdId", fixture.householdId),
          )
          .collect(),
      ]);

    if (
      definitions.length > 0 ||
      occurrences.length > 0 ||
      submissions.length > 0 ||
      reviews.length > 0 ||
      claims.length > 0 ||
      entries.length > 0
    ) {
      throw new ConvexError(
        "Refusing to add the Activity fixture to a non-empty Household.",
      );
    }

    const wednesday = previousLocalWeekday(fixture.today, 3);
    const thursday = previousLocalWeekday(fixture.today, 4);
    await createApprovedHistory(ctx, fixture, {
      childId: fixture.mayaId,
      title: "Set the table",
      valueSek: 15,
      reviewedAt: at(fixture, fixture.today, "08:14"),
    });
    await createApprovedHistory(ctx, fixture, {
      childId: fixture.alexId,
      title: "Walk the dog",
      valueSek: 20,
      reviewedAt: at(fixture, fixture.today, "07:42"),
      kind: "claimable",
    });
    await createApprovedHistory(ctx, fixture, {
      childId: fixture.alexId,
      title: "Load dishwasher",
      valueSek: 25,
      reviewedAt: at(fixture, thursday, "18:06"),
    });
    await createApprovedHistory(ctx, fixture, {
      childId: fixture.mayaId,
      title: "Fold laundry",
      valueSek: 10,
      reviewedAt: at(fixture, wednesday, "17:31"),
    });

    return { householdId: fixture.householdId, insertedReviews: 4 };
  },
});

export const alignActivityWeekdayFixture = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({ updatedReviews: v.number() }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const reviews = await ctx.db
      .query("choreReviews")
      .withIndex("by_household_reviewed_at", (q) =>
        q.eq("householdId", fixture.householdId),
      )
      .collect();
    if (reviews.length !== 4) {
      throw new ConvexError(
        "Activity weekday alignment requires exactly four fixture reviews.",
      );
    }

    const reviewByTitle = new Map<string, (typeof reviews)[number]>();
    for (const review of reviews) {
      const occurrence = await ctx.db.get(review.occurrenceId);
      if (
        review.decision !== "approved" ||
        !occurrence ||
        occurrence.householdId !== fixture.householdId ||
        reviewByTitle.has(occurrence.title)
      ) {
        throw new ConvexError(
          "Refusing to align an unexpected Activity visual fixture.",
        );
      }
      reviewByTitle.set(occurrence.title, review);
    }

    const dishwasherReview = reviewByTitle.get("Load dishwasher");
    const laundryReview = reviewByTitle.get("Fold laundry");
    if (
      !dishwasherReview ||
      !laundryReview ||
      reviewByTitle.size !== 4 ||
      !reviewByTitle.has("Set the table") ||
      !reviewByTitle.has("Walk the dog")
    ) {
      throw new ConvexError(
        "Refusing to align an unexpected Activity visual fixture.",
      );
    }

    await ctx.db.patch(dishwasherReview._id, {
      reviewedAt: at(fixture, previousLocalWeekday(fixture.today, 4), "18:06"),
    });
    await ctx.db.patch(laundryReview._id, {
      reviewedAt: at(fixture, previousLocalWeekday(fixture.today, 3), "17:31"),
    });
    return { updatedReviews: 2 };
  },
});

export const setActivityCelebrationFixtureMinute = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
    minute: v.union(v.literal("13"), v.literal("14"), v.literal("now")),
  },
  returns: v.object({ reviewedAt: v.number() }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const reviews = await ctx.db
      .query("choreReviews")
      .withIndex("by_household_reviewed_at", (q) =>
        q.eq("householdId", fixture.householdId),
      )
      .collect();
    if (reviews.length !== 4) {
      throw new ConvexError(
        "Activity celebration fixture requires exactly four reviews.",
      );
    }

    const candidates = await Promise.all(
      reviews.map(async (review) => ({
        review,
        occurrence: await ctx.db.get(review.occurrenceId),
      })),
    );
    const target = candidates.find(
      ({ occurrence }) => occurrence?.title === "Set the table",
    );
    if (!target) {
      throw new ConvexError("Set the table fixture review was not found.");
    }

    const reviewedAt =
      args.minute === "now"
        ? Date.now()
        : at(fixture, fixture.today, `08:${args.minute}`);
    await ctx.db.patch(target.review._id, { reviewedAt });
    return { reviewedAt };
  },
});

/**
 * Remove only the approved review projection used by the visual Activity
 * fixture. This keeps the current Child Home, Extras, claim, and finance
 * records intact so the empty Activity screen can be verified in isolation.
 */
export const clearActivityHistoryVisualState = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    deletedReviews: v.number(),
    deletedEarnings: v.number(),
    deletedSubmissions: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const reviews = await ctx.db
      .query("choreReviews")
      .withIndex("by_household_reviewed_at", (q) =>
        q.eq("householdId", fixture.householdId),
      )
      .collect();

    if (reviews.length === 0) {
      return { deletedReviews: 0, deletedEarnings: 0, deletedSubmissions: 0 };
    }

    const expectedTitles = new Set([
      "Set the table",
      "Walk the dog",
      "Load dishwasher",
      "Fold laundry",
      "Clean your room",
    ]);
    const candidates = await Promise.all(
      reviews.map(async (review) => {
        const occurrence = await ctx.db.get(review.occurrenceId);
        const submission = await ctx.db.get(review.submissionId);
        const earning = occurrence
          ? await ctx.db
              .query("ledgerEntries")
              .withIndex("by_occurrence_kind", (q) =>
                q.eq("occurrenceId", occurrence._id).eq("kind", "earning"),
              )
              .unique()
          : null;
        return { review, occurrence, submission, earning };
      }),
    );

    if (
      reviews.length !== expectedTitles.size ||
      candidates.some(
        ({ review, occurrence, submission, earning }) =>
          review.decision !== "approved" ||
          !occurrence ||
          !submission ||
          !earning ||
          occurrence.householdId !== fixture.householdId ||
          submission.householdId !== fixture.householdId ||
          earning.householdId !== fixture.householdId ||
          earning.reviewId !== review._id ||
          earning.amountSek !== occurrence.valueSek ||
          !expectedTitles.has(occurrence.title),
      ) ||
      new Set(candidates.map(({ occurrence }) => occurrence?.title)).size !==
        expectedTitles.size
    ) {
      throw new ConvexError(
        "Refusing to clear an unexpected Activity visual fixture.",
      );
    }

    let deletedEarnings = 0;
    let deletedSubmissions = 0;
    for (const { review, submission, earning } of candidates) {
      if (earning) {
        await ctx.db.delete(earning._id);
        deletedEarnings += 1;
      }
      if (submission) {
        if (submission.evidenceStorageId) {
          try {
            await ctx.storage.delete(submission.evidenceStorageId);
          } catch {
            // The fixture may already have removed the evidence object.
          }
        }
        await ctx.db.delete(submission._id);
        deletedSubmissions += 1;
      }
      await ctx.db.delete(review._id);
    }

    return {
      deletedReviews: reviews.length,
      deletedEarnings,
      deletedSubmissions,
    };
  },
});

/**
 * Rebuild the two cached balances after the guarded Activity-only cleanup.
 * The normal financial projection path remains the source of truth.
 */
export const rebuildActivityEmptyVisualFinance = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({ rebuiltBalances: v.number() }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const [reviews, entries, balances, alexPayouts] = await Promise.all([
      ctx.db
        .query("choreReviews")
        .withIndex("by_household_reviewed_at", (q) =>
          q.eq("householdId", fixture.householdId),
        )
        .collect(),
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_household_created_at", (q) =>
          q.eq("householdId", fixture.householdId),
        )
        .collect(),
      ctx.db
        .query("childFinancialBalances")
        .withIndex("by_household", (q) =>
          q.eq("householdId", fixture.householdId),
        )
        .collect(),
      ctx.db
        .query("payouts")
        .withIndex("by_child_created_at", (q) =>
          q.eq("childId", fixture.alexId),
        )
        .order("desc")
        .take(5),
    ]);
    if (
      reviews.length !== 0 ||
      entries.length !== 0 ||
      balances.length !== 2 ||
      alexPayouts.length !== 1 ||
      !balances.some(({ childId }) => childId === fixture.alexId) ||
      !balances.some(({ childId }) => childId === fixture.mayaId) ||
      alexPayouts[0].householdId !== fixture.householdId ||
      !["pending", "no_payment"].includes(alexPayouts[0].status) ||
      ![70, 0].includes(alexPayouts[0].balanceAtCloseSek)
    ) {
      throw new ConvexError(
        "Refusing to rebuild an unexpected empty Activity finance fixture.",
      );
    }

    const [alexPayout] = alexPayouts;
    if (alexPayout.status === "pending") {
      await ctx.db.patch(alexPayout._id, {
        balanceAtCloseSek: 0,
        amountDueSek: 0,
        pendingOutcomeCount: 0,
        status: "no_payment",
      });
    }

    await rebuildFinancialBalanceProjection(ctx, fixture.alexId, fixture.now);
    await rebuildFinancialBalanceProjection(ctx, fixture.mayaId, fixture.now);

    return { rebuiltBalances: 2 };
  },
});

export const transitionActivityToChildHome = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    archivedDefinitions: v.number(),
    cancelledOpenOccurrences: v.number(),
    createdChildHomeChores: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const definitions = await ctx.db
      .query("choreDefinitions")
      .withIndex("by_household", (q) =>
        q.eq("householdId", fixture.householdId),
      )
      .collect();
    const expectedTitles = [
      "Fold laundry",
      "Load dishwasher",
      "Set the table",
      "Walk the dog",
    ];
    const actualTitles = definitions.map(({ title }) => title).sort();
    if (
      definitions.length !== expectedTitles.length ||
      actualTitles.some((title, index) => title !== expectedTitles[index]) ||
      definitions.some(({ archivedAt }) => archivedAt !== undefined)
    ) {
      throw new ConvexError(
        "Refusing to transition an unexpected Activity fixture.",
      );
    }

    const definitionIds = new Set(definitions.map(({ _id }) => _id));
    const now = Date.now();
    for (const definition of definitions) {
      await ctx.db.patch(definition._id, {
        archivedAt: now,
        archivedByAuthUserId: fixture.parentAuthUserId,
        updatedAt: now,
      });
    }

    const occurrences = await ctx.db
      .query("choreOccurrences")
      .withIndex("by_household", (q) =>
        q.eq("householdId", fixture.householdId),
      )
      .collect();
    const openOccurrences = occurrences.filter(
      (occurrence) =>
        definitionIds.has(occurrence.choreDefinitionId) &&
        (occurrence.state === "scheduled" || occurrence.state === "available"),
    );
    for (const occurrence of openOccurrences) {
      await ctx.db.patch(occurrence._id, { state: "cancelled" });
    }

    const balances = await ctx.db
      .query("childFinancialBalances")
      .withIndex("by_household", (q) =>
        q.eq("householdId", fixture.householdId),
      )
      .collect();
    const alexBalance = balances.find(
      ({ childId }) => childId === fixture.alexId,
    );
    const mayaBalance = balances.find(
      ({ childId }) => childId === fixture.mayaId,
    );
    if (!alexBalance || !mayaBalance || balances.length !== 2) {
      throw new ConvexError(
        "Child Home transition requires exactly two fixture balances.",
      );
    }
    await ctx.db.patch(alexBalance._id, {
      earningTotalSek: 240,
      penaltyTotalSek: 0,
      settledTotalSek: 0,
      entryCount: 2,
      updatedAt: now,
    });
    await ctx.db.patch(mayaBalance._id, {
      earningTotalSek: 110,
      penaltyTotalSek: 0,
      settledTotalSek: 0,
      entryCount: 2,
      updatedAt: now,
    });

    const chores = [
      {
        title: "Clean your room",
        description: "Make the bed, put clothes away, and clear the floor.",
        valueSek: 30,
        deadline: "18:00",
        state: "available" as const,
        unlock: true,
      },
      {
        title: "Feed the dog",
        description: undefined,
        valueSek: 10,
        deadline: "20:00",
        state: "available" as const,
        unlock: false,
      },
      {
        title: "Take out recycling",
        description: undefined,
        valueSek: 20,
        deadline: "21:00",
        state: "submitted" as const,
        unlock: false,
      },
    ];

    for (const chore of chores) {
      const definitionId = await createPersonalDefinition(ctx, fixture, {
        childId: fixture.alexId,
        title: chore.title,
        description: chore.description,
        valueSek: chore.valueSek,
        deadlineLocalTime: chore.deadline,
        isUnlockChore: chore.unlock,
      });
      const occurrenceId = await createOccurrence(ctx, fixture, {
        definitionId,
        kind: "personal",
        title: chore.title,
        description: chore.description,
        valueSek: chore.valueSek,
        deadlineLocalTime: chore.deadline,
        state: chore.state,
        childId: fixture.alexId,
        isUnlockChore: chore.unlock,
      });
      if (chore.state === "submitted") {
        await createPendingSubmission(
          ctx,
          fixture,
          occurrenceId,
          fixture.alexId,
          now - 15 * 60_000,
        );
      }
    }

    return {
      archivedDefinitions: definitions.length,
      cancelledOpenOccurrences: openOccurrences.length,
      createdChildHomeChores: chores.length,
    };
  },
});

export const ensureChildHomeInstructions = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    patchedDefinition: v.boolean(),
    patchedOccurrence: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const description = "Make the bed, put clothes away, and clear the floor.";
    const definitions = (
      await ctx.db
        .query("choreDefinitions")
        .withIndex("by_household", (q) =>
          q.eq("householdId", fixture.householdId),
        )
        .collect()
    ).filter(
      (definition) =>
        definition.archivedAt === undefined &&
        definition.kind === "personal" &&
        definition.title === "Clean your room" &&
        definition.personalChildId === fixture.alexId &&
        definition.valueSek === 30 &&
        definition.isUnlockChore,
    );
    if (definitions.length !== 1) {
      throw new ConvexError(
        "Expected exactly one active Clean your room fixture definition.",
      );
    }
    const [definition] = definitions;
    if (
      definition.description !== undefined &&
      definition.description !== description
    ) {
      throw new ConvexError("Refusing to replace unexpected instructions.");
    }

    const occurrences = (
      await ctx.db
        .query("choreOccurrences")
        .withIndex("by_household", (q) =>
          q.eq("householdId", fixture.householdId),
        )
        .collect()
    ).filter(
      (occurrence) =>
        occurrence.choreDefinitionId === definition._id &&
        occurrence.title === "Clean your room" &&
        occurrence.personalChildId === fixture.alexId &&
        occurrence.state === "available" &&
        occurrence.valueSek === 30,
    );
    if (occurrences.length !== 1) {
      throw new ConvexError(
        "Expected exactly one available Clean your room fixture occurrence.",
      );
    }
    const [occurrence] = occurrences;
    if (
      occurrence.description !== undefined &&
      occurrence.description !== description
    ) {
      throw new ConvexError(
        "Refusing to replace unexpected occurrence instructions.",
      );
    }

    const patchedDefinition = definition.description !== description;
    const patchedOccurrence = occurrence.description !== description;
    if (patchedDefinition) {
      await ctx.db.patch(definition._id, { description });
    }
    if (patchedOccurrence) {
      await ctx.db.patch(occurrence._id, { description });
    }
    return { patchedDefinition, patchedOccurrence };
  },
});

/**
 * Advance only the guarded Child Home visual fixture into the real unlocked
 * Extras state. The existing submission is approved through the same domain
 * helper used by the Parent review flow so review and ledger projections stay
 * consistent.
 */
export const transitionChildHomeToExtrasPool = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    approvedUnlock: v.boolean(),
    createdClaimables: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );

    const activeUnlockDefinitions = (
      await ctx.db
        .query("choreDefinitions")
        .withIndex("by_household_personal_child_unlock", (q) =>
          q
            .eq("householdId", fixture.householdId)
            .eq("personalChildId", fixture.alexId)
            .eq("isUnlockChore", true),
        )
        .take(20)
    ).filter((definition) => definition.archivedAt === undefined);
    if (
      activeUnlockDefinitions.length !== 1 ||
      activeUnlockDefinitions[0].kind !== "personal" ||
      activeUnlockDefinitions[0].title !== "Clean your room" ||
      activeUnlockDefinitions[0].valueSek !== 30
    ) {
      throw new ConvexError(
        "Expected exactly one active Clean your room Unlock Chore fixture.",
      );
    }
    const [unlockDefinition] = activeUnlockDefinitions;

    const unlockOccurrence = await ctx.db
      .query("choreOccurrences")
      .withIndex("by_definition_scheduled_date", (q) =>
        q
          .eq("choreDefinitionId", unlockDefinition._id)
          .eq("scheduledLocalDate", fixture.today),
      )
      .unique();
    if (
      !unlockOccurrence ||
      unlockOccurrence.kind !== "personal" ||
      unlockOccurrence.personalChildId !== fixture.alexId ||
      unlockOccurrence.state !== "submitted" ||
      !unlockOccurrence.isUnlockChore
    ) {
      throw new ConvexError(
        "Expected the submitted Child Home Unlock Chore occurrence.",
      );
    }

    const submission = await ctx.db
      .query("choreSubmissions")
      .withIndex("by_occurrence_attempt", (q) =>
        q.eq("occurrenceId", unlockOccurrence._id).eq("attemptNumber", 1),
      )
      .unique();
    if (!submission || submission.childId !== fixture.alexId) {
      throw new ConvexError(
        "Expected one initial submission for the Unlock Chore fixture.",
      );
    }
    const existingReview = await ctx.db
      .query("choreReviews")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .unique();
    if (existingReview) {
      throw new ConvexError("The Unlock Chore fixture was already reviewed.");
    }

    const activeClaimableDefinitions = (
      await ctx.db
        .query("choreDefinitions")
        .withIndex("by_household_kind", (q) =>
          q.eq("householdId", fixture.householdId).eq("kind", "claimable"),
        )
        .take(50)
    ).filter((definition) => definition.archivedAt === undefined);
    if (activeClaimableDefinitions.length > 0) {
      throw new ConvexError(
        "Refusing to add Extras over existing active Claimable Chores.",
      );
    }

    await approvePersonalSubmission(
      ctx,
      submission._id,
      fixture.parentAuthUserId,
      fixture.now,
    );
    const createdClaimables = await seedClaimableExtras(ctx, fixture);

    return { approvedUnlock: true, createdClaimables };
  },
});

export const ensureExtrasPoolVisualAvailability = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    patchedDefinitions: v.number(),
    patchedOccurrences: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const specs = [
      ["Wash the car", 50, "17:30", 0],
      ["Fold the laundry", 20, "19:00", 0],
      ["Water the plants", 15, "18:00", 1],
      ["Set the table", 15, "18:30", 0],
    ] as const;
    const activeDefinitions = (
      await ctx.db
        .query("choreDefinitions")
        .withIndex("by_household_kind", (q) =>
          q.eq("householdId", fixture.householdId).eq("kind", "claimable"),
        )
        .take(50)
    ).filter((definition) => definition.archivedAt === undefined);
    const expectedTitles = specs.map(([title]) => title).sort();
    const allExpectedTitles = [...expectedTitles, "Previous extra"].sort();
    const actualTitles = activeDefinitions.map(({ title }) => title).sort();
    if (
      activeDefinitions.length !== allExpectedTitles.length ||
      actualTitles.some((title, index) => title !== allExpectedTitles[index])
    ) {
      throw new ConvexError(
        "Expected exactly the guarded Extras pool fixture definitions.",
      );
    }
    const definitions = activeDefinitions.filter(({ title }) =>
      expectedTitles.includes(title as (typeof expectedTitles)[number]),
    );

    const definitionIds = new Set(definitions.map(({ _id }) => _id));
    const occurrences = (
      await ctx.db
        .query("choreOccurrences")
        .withIndex("by_household", (q) =>
          q.eq("householdId", fixture.householdId),
        )
        .take(100)
    ).filter((occurrence) => definitionIds.has(occurrence.choreDefinitionId));
    if (occurrences.length !== specs.length) {
      throw new ConvexError(
        "Expected exactly four active Extras pool fixture occurrences.",
      );
    }

    for (const [
      title,
      valueSek,
      deadlineLocalTime,
      deadlineDayOffset,
    ] of specs) {
      const definition = definitions.find(
        (candidate) => candidate.title === title,
      );
      if (!definition || definition.valueSek !== valueSek) {
        throw new ConvexError(`Unexpected ${title} fixture definition.`);
      }
      const matchingOccurrences = occurrences.filter(
        (candidate) => candidate.choreDefinitionId === definition._id,
      );
      if (
        matchingOccurrences.length !== 1 ||
        matchingOccurrences[0].title !== title ||
        matchingOccurrences[0].valueSek !== valueSek ||
        matchingOccurrences[0].state !== "available"
      ) {
        throw new ConvexError(`Unexpected ${title} fixture occurrence.`);
      }
      const [occurrence] = matchingOccurrences;
      const availabilityStartsAt = at(fixture, fixture.today, "00:00");
      const deadlineAt = at(
        fixture,
        addLocalDays(fixture.today, deadlineDayOffset),
        deadlineLocalTime,
      );

      await ctx.db.patch(definition._id, {
        recurrence: { kind: "one_off", scheduledDate: fixture.today },
        availabilityLocalTime: "00:00",
        deadlineLocalTime,
        deadlineDayOffset,
        updatedAt: fixture.now,
      });
      await ctx.db.patch(occurrence._id, {
        scheduledLocalDate: fixture.today,
        availabilityLocalTime: "00:00",
        availabilityStartsAt,
        availabilityReachedAt: availabilityStartsAt,
        deadlineLocalTime,
        deadlineDayOffset,
        deadlineAt,
      });
    }

    return {
      patchedDefinitions: definitions.length,
      patchedOccurrences: occurrences.length,
    };
  },
});

export const ensureActiveClaimVisualWindow = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    claimId: v.id("choreClaims"),
    patchedDefinition: v.boolean(),
    patchedOccurrence: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const definitions = (
      await ctx.db
        .query("choreDefinitions")
        .withIndex("by_household_kind", (q) =>
          q.eq("householdId", fixture.householdId).eq("kind", "claimable"),
        )
        .take(20)
    ).filter((definition) => definition.archivedAt === undefined);
    const expectedTitles = [
      "Fold the laundry",
      "Previous extra",
      "Set the table",
      "Wash the car",
      "Water the plants",
    ];
    const actualTitles = definitions.map(({ title }) => title).sort();
    if (
      definitions.length !== expectedTitles.length ||
      actualTitles.some((title, index) => title !== expectedTitles[index])
    ) {
      throw new ConvexError(
        "Refusing to adjust an unexpected Extras claim fixture.",
      );
    }

    const washDefinition = definitions.find(
      ({ title }) => title === "Wash the car",
    );
    if (!washDefinition) {
      throw new ConvexError("Wash the car fixture definition was not found.");
    }
    const washOccurrences = await ctx.db
      .query("choreOccurrences")
      .withIndex("by_definition_scheduled_date", (q) =>
        q
          .eq("choreDefinitionId", washDefinition._id)
          .eq("scheduledLocalDate", fixture.today),
      )
      .take(5);
    if (washOccurrences.length !== 1) {
      throw new ConvexError(
        "Expected one Wash the car occurrence for the active claim fixture.",
      );
    }
    const [washOccurrence] = washOccurrences;
    if (washOccurrence.state !== "available") {
      throw new ConvexError(
        "Wash the car must remain available for the active claim fixture.",
      );
    }

    const claims = await ctx.db
      .query("choreClaims")
      .withIndex("by_occurrence", (q) =>
        q.eq("occurrenceId", washOccurrence._id),
      )
      .collect();
    if (
      claims.length !== 1 ||
      claims[0].childId !== fixture.alexId ||
      claims[0].state !== "claimed"
    ) {
      throw new ConvexError("Expected one active Alex claim for Wash the car.");
    }

    const description = "Wash the outside of the car and put the bucket away.";
    const deadlineAt = at(fixture, addLocalDays(fixture.today, 1), "17:30");
    await ctx.db.patch(washDefinition._id, {
      description,
      deadlineLocalTime: "17:30",
      deadlineDayOffset: 1,
      updatedAt: fixture.now,
    });
    await ctx.db.patch(washOccurrence._id, {
      description,
      deadlineLocalTime: "17:30",
      deadlineDayOffset: 1,
      deadlineAt,
    });

    return {
      claimId: claims[0]._id,
      patchedDefinition: true,
      patchedOccurrence: true,
    };
  },
});

/**
 * Move only the guarded Wash the car claim into the real Redo-required state
 * after its initial submission has been recorded. This preserves the same
 * review, Redo, occurrence, and claim transitions used by Parent review.
 */
export const transitionActiveClaimToRedoVisualState = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    occurrenceId: v.id("choreOccurrences"),
    claimId: v.id("choreClaims"),
    redoId: v.id("choreRedos"),
    deadlineAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const definitions = (
      await ctx.db
        .query("choreDefinitions")
        .withIndex("by_household_kind", (q) =>
          q.eq("householdId", fixture.householdId).eq("kind", "claimable"),
        )
        .take(20)
    ).filter((definition) => definition.archivedAt === undefined);
    const washDefinition = definitions.find(
      (definition) =>
        definition.title === "Wash the car" && definition.valueSek === 50,
    );
    if (!washDefinition) {
      throw new ConvexError(
        "Wash the car Redo fixture definition was not found.",
      );
    }

    const occurrence = await ctx.db
      .query("choreOccurrences")
      .withIndex("by_definition_scheduled_date", (q) =>
        q
          .eq("choreDefinitionId", washDefinition._id)
          .eq("scheduledLocalDate", fixture.today),
      )
      .unique();
    if (
      !occurrence ||
      occurrence.kind !== "claimable" ||
      occurrence.title !== "Wash the car" ||
      occurrence.valueSek !== 50 ||
      occurrence.state !== "submitted" ||
      occurrence.deadlineAt <= fixture.now
    ) {
      throw new ConvexError(
        "Expected one on-time submitted Wash the car occurrence for Redo.",
      );
    }

    const claims = await ctx.db
      .query("choreClaims")
      .withIndex("by_occurrence", (q) => q.eq("occurrenceId", occurrence._id))
      .collect();
    const submittedClaims = claims.filter(
      (claim) =>
        claim.childId === fixture.alexId && claim.state === "submitted",
    );
    if (submittedClaims.length !== 1) {
      throw new ConvexError(
        "Expected one submitted Alex claim for the Redo fixture.",
      );
    }
    const [submittedClaim] = submittedClaims;

    const submission = await ctx.db
      .query("choreSubmissions")
      .withIndex("by_occurrence_attempt", (q) =>
        q.eq("occurrenceId", occurrence._id).eq("attemptNumber", 1),
      )
      .unique();
    if (!submission || submission.childId !== fixture.alexId) {
      throw new ConvexError(
        "Expected one initial Alex submission for the Redo fixture.",
      );
    }
    const [existingReview, existingRedo] = await Promise.all([
      ctx.db
        .query("choreReviews")
        .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
        .unique(),
      ctx.db
        .query("choreRedos")
        .withIndex("by_occurrence", (q) => q.eq("occurrenceId", occurrence._id))
        .unique(),
    ]);
    if (existingReview || existingRedo) {
      throw new ConvexError(
        "The Wash the car Redo fixture has already been reviewed.",
      );
    }

    const redoDeadlineLocalDate = addLocalDays(fixture.today, 1);
    const result = await rejectInitialSubmission(
      ctx,
      submission._id,
      fixture.parentAuthUserId,
      "claimable",
      redoDeadlineLocalDate,
      "17:00",
      fixture.now,
    );

    return {
      occurrenceId: result.occurrenceId,
      claimId: submittedClaim._id,
      redoId: result.redoId,
      deadlineAt: result.redoDeadlineAt,
    };
  },
});

export const ensureChildMoneyPositivePayout = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    createdPeriods: v.number(),
    createdPayouts: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const household = await ctx.db.get(fixture.householdId);
    if (!household || household.payoutWeekday !== "friday") {
      throw new ConvexError(
        "Expected the guarded Friday payout Household fixture.",
      );
    }

    const [periods, payouts, alexBalance] = await Promise.all([
      ctx.db
        .query("payoutPeriods")
        .withIndex("by_household_start_at", (q) =>
          q.eq("householdId", fixture.householdId),
        )
        .take(10),
      ctx.db
        .query("payouts")
        .withIndex("by_household_created_at", (q) =>
          q.eq("householdId", fixture.householdId),
        )
        .take(10),
      ctx.db
        .query("childFinancialBalances")
        .withIndex("by_child", (q) => q.eq("childId", fixture.alexId))
        .unique(),
    ]);
    const window = getCurrentPayoutWeekWindow({
      now: fixture.now,
      timezone: fixture.timezone,
      payoutWeekday: household.payoutWeekday,
    });
    if (payouts.length > 0 || periods.length > 1) {
      throw new ConvexError(
        "Refusing to add the Money fixture over existing payout records.",
      );
    }
    const [existingPeriod] = periods;
    if (
      existingPeriod &&
      (existingPeriod.state !== "open" ||
        existingPeriod.startLocalDate !== window.startLocalDate ||
        existingPeriod.endLocalDate !== window.endLocalDate ||
        existingPeriod.startAt !== window.startAt ||
        existingPeriod.endAt !== window.endAt ||
        existingPeriod.timezone !== window.timezone ||
        existingPeriod.payoutWeekday !== window.payoutWeekday)
    ) {
      throw new ConvexError(
        "Refusing to reuse an unexpected existing payout period.",
      );
    }
    if (
      !alexBalance ||
      alexBalance.householdId !== fixture.householdId ||
      alexBalance.earningTotalSek +
        alexBalance.penaltyTotalSek -
        alexBalance.settledTotalSek <=
        0
    ) {
      throw new ConvexError(
        "Expected Alex to have a positive guarded Running Balance.",
      );
    }

    if (!existingPeriod) {
      await ctx.db.insert("payoutPeriods", {
        householdId: fixture.householdId,
        ...window,
        state: "open",
        createdAt: fixture.now,
      });
    }
    const previousStart = addLocalDays(window.startLocalDate, -7);
    const previousPeriodId = await ctx.db.insert("payoutPeriods", {
      householdId: fixture.householdId,
      startLocalDate: previousStart,
      endLocalDate: window.startLocalDate,
      startAt: at(fixture, previousStart, "00:00"),
      endAt: window.startAt,
      timezone: fixture.timezone,
      payoutWeekday: household.payoutWeekday,
      state: "closed",
      createdAt: window.startAt - 7 * 86_400_000,
      closedAt: window.startAt,
    });
    await ctx.db.insert("payouts", {
      householdId: fixture.householdId,
      payoutPeriodId: previousPeriodId,
      childId: fixture.alexId,
      balanceAtCloseSek: 70,
      amountDueSek: 70,
      pendingOutcomeCount: 1,
      status: "pending",
      createdAt: window.startAt + 1,
    });
    await ctx.db.insert("payouts", {
      householdId: fixture.householdId,
      payoutPeriodId: previousPeriodId,
      childId: fixture.mayaId,
      balanceAtCloseSek: 50,
      amountDueSek: 50,
      pendingOutcomeCount: 0,
      status: "paid",
      createdAt: window.startAt + 2,
      paidAt: window.startAt + 60_000,
      paidByAuthUserId: fixture.parentAuthUserId,
    });

    return {
      createdPeriods: existingPeriod ? 1 : 2,
      createdPayouts: 2,
    };
  },
});

export const setChildMoneyVisualMode = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
    mode: v.union(
      v.literal("positive"),
      v.literal("zero"),
      v.literal("negative"),
    ),
  },
  returns: v.object({
    mode: v.union(
      v.literal("positive"),
      v.literal("zero"),
      v.literal("negative"),
    ),
    balanceSek: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const [balance, alexPayouts] = await Promise.all([
      ctx.db
        .query("childFinancialBalances")
        .withIndex("by_child", (q) => q.eq("childId", fixture.alexId))
        .unique(),
      ctx.db
        .query("payouts")
        .withIndex("by_child_created_at", (q) =>
          q.eq("childId", fixture.alexId),
        )
        .order("desc")
        .take(5),
    ]);
    if (
      !balance ||
      balance.householdId !== fixture.householdId ||
      alexPayouts.length !== 1 ||
      alexPayouts[0].householdId !== fixture.householdId ||
      !["pending", "no_payment"].includes(alexPayouts[0].status) ||
      ![70, 0, -40].includes(alexPayouts[0].balanceAtCloseSek)
    ) {
      throw new ConvexError(
        "Refusing to change an unexpected Child Money visual fixture.",
      );
    }
    const [payout] = alexPayouts;
    const positive = args.mode === "positive";
    const negative = args.mode === "negative";
    const balanceSek = positive ? 270 : negative ? -40 : 0;

    await ctx.db.patch(balance._id, {
      earningTotalSek: 270,
      penaltyTotalSek: negative ? -40 : 0,
      settledTotalSek: positive ? 0 : 270,
      updatedAt: fixture.now,
    });
    await ctx.db.patch(payout._id, {
      balanceAtCloseSek: positive ? 70 : balanceSek,
      amountDueSek: positive ? 70 : 0,
      pendingOutcomeCount: positive ? 1 : 0,
      status: positive ? "pending" : "no_payment",
    });

    return { mode: args.mode, balanceSek };
  },
});

export const ensureChildHomeUpcomingFixture = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    occurrenceId: v.id("choreOccurrences"),
    availabilityStartsAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const description = "Make the bed, put clothes away, and clear the floor.";
    const definitions = (
      await ctx.db
        .query("choreDefinitions")
        .withIndex("by_household_personal_child_unlock", (q) =>
          q
            .eq("householdId", fixture.householdId)
            .eq("personalChildId", fixture.alexId)
            .eq("isUnlockChore", true),
        )
        .take(20)
    ).filter((definition) => definition.archivedAt === undefined);
    if (
      definitions.length !== 1 ||
      definitions[0].title !== "Clean your room" ||
      definitions[0].description !== description ||
      definitions[0].recurrence.kind !== "daily"
    ) {
      throw new ConvexError(
        "Expected the guarded recurring Clean your room fixture definition.",
      );
    }
    const [definition] = definitions;
    const tomorrow = addLocalDays(fixture.today, 1);
    const occurrence = await ctx.db
      .query("choreOccurrences")
      .withIndex("by_definition_scheduled_date", (q) =>
        q
          .eq("choreDefinitionId", definition._id)
          .eq("scheduledLocalDate", tomorrow),
      )
      .unique();
    if (
      !occurrence ||
      occurrence.state !== "scheduled" ||
      occurrence.title !== "Clean your room" ||
      occurrence.valueSek !== 30 ||
      (occurrence.description !== undefined &&
        occurrence.description !== description)
    ) {
      throw new ConvexError(
        "Expected tomorrow's guarded scheduled Unlock Chore occurrence.",
      );
    }
    const availabilityStartsAt = at(fixture, tomorrow, "08:00");
    await ctx.db.patch(definition._id, {
      availabilityLocalTime: "08:00",
      updatedAt: fixture.now,
    });
    await ctx.db.patch(occurrence._id, {
      description,
      availabilityLocalTime: "08:00",
      availabilityStartsAt,
    });

    return { occurrenceId: occurrence._id, availabilityStartsAt };
  },
});

export const validateTarget = internalQuery({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    return null;
  },
});

export const inspectReviewsQueueEvidence = internalQuery({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    submissionId: v.union(v.id("choreSubmissions"), v.null()),
    evidenceStorageId: v.union(v.id("_storage"), v.null()),
    pendingTitles: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const submission = await reviewsQueueEvidenceSubmission(ctx, fixture);
    const pendingOccurrences = await ctx.db
      .query("choreOccurrences")
      .withIndex("by_household_state_availability", (q) =>
        q.eq("householdId", fixture.householdId).eq("state", "submitted"),
      )
      .take(20);
    return {
      submissionId: submission?._id ?? null,
      evidenceStorageId: submission?.evidenceStorageId ?? null,
      pendingTitles: pendingOccurrences.map((occurrence) => occurrence.title),
    };
  },
});

export const ensureReviewsQueueEvidence = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
    evidenceStorageId: v.id("_storage"),
  },
  returns: v.object({
    submissionId: v.id("choreSubmissions"),
    evidenceStorageId: v.id("_storage"),
    newlyAttached: v.boolean(),
    seededQueue: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const metadata = await ctx.db.system.get(
      "_storage",
      args.evidenceStorageId,
    );
    if (!metadata || metadata.contentType !== "image/png") {
      throw new ConvexError(
        "Visual review evidence must reference an uploaded PNG image.",
      );
    }

    let submission = await reviewsQueueEvidenceSubmission(ctx, fixture);
    let seededQueue = false;
    if (!submission) {
      const pendingOccurrences = await ctx.db
        .query("choreOccurrences")
        .withIndex("by_household_state_availability", (q) =>
          q.eq("householdId", fixture.householdId).eq("state", "submitted"),
        )
        .take(20);
      if (pendingOccurrences.length > 0) {
        throw new ConvexError(
          "Refusing to add review fixtures while other submissions are pending.",
        );
      }

      await seedReviewsQueue(ctx, fixture, args.evidenceStorageId);
      submission = await reviewsQueueEvidenceSubmission(ctx, fixture);
      if (
        !submission ||
        submission.evidenceStorageId !== args.evidenceStorageId
      ) {
        throw new ConvexError(
          "Unable to confirm the newly seeded review evidence.",
        );
      }
      seededQueue = true;
    }

    if (submission.evidenceStorageId === args.evidenceStorageId) {
      return {
        submissionId: submission._id,
        evidenceStorageId: args.evidenceStorageId,
        newlyAttached: seededQueue,
        seededQueue,
      };
    }
    if (submission.evidenceStorageId !== undefined) {
      throw new ConvexError(
        "Refusing to replace existing evidence on the visual submission.",
      );
    }

    await ctx.db.patch("choreSubmissions", submission._id, {
      evidenceStorageId: args.evidenceStorageId,
    });
    return {
      submissionId: submission._id,
      evidenceStorageId: args.evidenceStorageId,
      newlyAttached: true,
      seededQueue,
    };
  },
});

export const createEvidenceUploadUrl = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    return await ctx.storage.generateUploadUrl();
  },
});

export const seedReviewsQueueWithEvidence = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
    evidenceStorageId: v.id("_storage"),
  },
  returns: v.object({
    scenario: v.literal("reviews_queue"),
    householdId: v.id("households"),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    await resetVisualData(ctx, fixture);
    await seedReviewsQueue(ctx, fixture, args.evidenceStorageId);
    return {
      scenario: "reviews_queue" as const,
      householdId: fixture.householdId,
    };
  },
});

export const inspect = internalQuery({
  args: { householdId: v.id("households") },
  returns: v.object({
    definitions: v.number(),
    occurrences: v.number(),
    submissions: v.number(),
    reviews: v.number(),
    claims: v.number(),
    ledgerEntries: v.number(),
    payoutPeriods: v.number(),
    payouts: v.number(),
    balances: v.number(),
  }),
  handler: async (ctx, args) => {
    assertDevelopmentOnly();
    const householdId = args.householdId;
    const [
      definitions,
      occurrences,
      submissions,
      reviews,
      claims,
      ledgerEntries,
      payoutPeriods,
      payouts,
      balances,
    ] = await Promise.all([
      ctx.db
        .query("choreDefinitions")
        .withIndex("by_household", (q) => q.eq("householdId", householdId))
        .collect(),
      ctx.db
        .query("choreOccurrences")
        .withIndex("by_household", (q) => q.eq("householdId", householdId))
        .collect(),
      ctx.db
        .query("choreSubmissions")
        .withIndex("by_household_submitted_at", (q) =>
          q.eq("householdId", householdId),
        )
        .collect(),
      ctx.db
        .query("choreReviews")
        .withIndex("by_household_reviewed_at", (q) =>
          q.eq("householdId", householdId),
        )
        .collect(),
      ctx.db
        .query("choreClaims")
        .withIndex("by_household_claimed_at", (q) =>
          q.eq("householdId", householdId),
        )
        .collect(),
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_household_created_at", (q) =>
          q.eq("householdId", householdId),
        )
        .collect(),
      ctx.db
        .query("payoutPeriods")
        .withIndex("by_household_start_at", (q) =>
          q.eq("householdId", householdId),
        )
        .collect(),
      ctx.db
        .query("payouts")
        .withIndex("by_household_created_at", (q) =>
          q.eq("householdId", householdId),
        )
        .collect(),
      ctx.db
        .query("childFinancialBalances")
        .withIndex("by_household", (q) => q.eq("householdId", householdId))
        .collect(),
    ]);
    return {
      definitions: definitions.length,
      occurrences: occurrences.length,
      submissions: submissions.length,
      reviews: reviews.length,
      claims: claims.length,
      ledgerEntries: ledgerEntries.length,
      payoutPeriods: payoutPeriods.length,
      payouts: payouts.length,
      balances: balances.length,
    };
  },
});

/**
 * Stand in for a Parent approving one waiting Personal Chore for a fixture
 * Child, so approval-driven UI (the child celebration, activity, balance) can
 * be exercised end to end without a Parent sign-in. Uses the same domain
 * helper as the Parent review flow. Guarded to the development fixture
 * Household like every other fixture operation.
 */
export const approvePendingPersonalChore = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
    child: v.union(v.literal("alex"), v.literal("maya")),
    /** Approve this chore title; otherwise the newest waiting one. */
    choreTitle: v.optional(v.string()),
  },
  returns: v.object({
    approvedTitle: v.string(),
    valueSek: v.number(),
  }),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    const childId = args.child === "alex" ? fixture.alexId : fixture.mayaId;

    const waiting = (
      await ctx.db
        .query("choreOccurrences")
        .withIndex("by_personal_child_state_availability", (q) =>
          q.eq("personalChildId", childId).eq("state", "submitted"),
        )
        .order("desc")
        .take(20)
    ).filter(
      (occurrence) =>
        occurrence.householdId === fixture.householdId &&
        (args.choreTitle === undefined || occurrence.title === args.choreTitle),
    );

    const occurrence = waiting[0];
    if (!occurrence) {
      throw new ConvexError("No waiting Personal Chore matches.");
    }

    const submission = await ctx.db
      .query("choreSubmissions")
      .withIndex("by_occurrence", (q) => q.eq("occurrenceId", occurrence._id))
      .order("desc")
      .first();
    if (!submission || submission.childId !== childId) {
      throw new ConvexError("Expected a submission from this Child.");
    }

    await approvePersonalSubmission(
      ctx,
      submission._id,
      fixture.parentAuthUserId,
      Date.now(),
    );

    return { approvedTitle: occurrence.title, valueSek: occurrence.valueSek };
  },
});

/**
 * Lets a real Parent account join the test household through the normal
 * invite flow. The caller generates the token locally and passes only its
 * SHA-256 hash, exactly as `parentInvites.storeGeneratedInvite` stores it.
 */
export const createParentInvite = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
    tokenHash: v.string(),
  },
  returns: v.id("parentInvites"),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    return await ctx.db.insert("parentInvites", {
      householdId: fixture.householdId,
      tokenHash: args.tokenHash,
      createdByAuthUserId: args.expectedParentAuthUserId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Dev cleanup for the one-household rule: removes a single Parent
 * membership row. Refuses to leave a household with no Parent.
 */
export const removeParentMembership = internalMutation({
  args: { membershipId: v.id("householdMembers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertDevelopmentOnly();
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) return null;
    const parents = await ctx.db
      .query("householdMembers")
      .withIndex("by_household", (q) =>
        q.eq("householdId", membership.householdId),
      )
      .take(2);
    if (parents.length < 2) {
      throw new ConvexError("That household would be left without a Parent.");
    }
    await ctx.db.delete(args.membershipId);
    return null;
  },
});

/** Dev: a submitted Personal Chore for Alex or Maya, waiting for review. */
export const createPendingTestChore = internalMutation({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
    child: v.union(v.literal("alex"), v.literal("maya")),
    title: v.string(),
    valueSek: v.number(),
  },
  returns: v.id("choreOccurrences"),
  handler: async (ctx, args) => {
    const fixture = await loadFixtureContext(
      ctx,
      args.householdId,
      args.expectedParentAuthUserId,
    );
    return await createPendingPersonal(ctx, fixture, {
      childId: args.child === "alex" ? fixture.alexId : fixture.mayaId,
      title: args.title,
      valueSek: args.valueSek,
      deadline: "23:30",
      submitted: "09:00",
    });
  },
});
