import { ConvexError } from 'convex/values';

import { internal } from '../../_generated/api';
import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import {
  getScheduledLocalDates,
  resolveOccurrenceSchedule,
} from '../scheduling/choreScheduling';
import {
  scheduleOccurrenceNotifications,
} from '../notifications/orchestration';
import {
  getClaimCommitmentLockAt,
} from '../claims/commitmentRules';

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

type GenerationOptions = {
  /*
   * Production generation schedules
   * exact lifecycle callbacks.
   *
   * Smoke tests disable scheduling so
   * they do not leave future scheduled
   * functions behind.
   */
  scheduleTransitions?:
    boolean;

  /*
   * Optional deterministic clock for
   * automated tests.
   */
  now?: number;
};

function localDateDayNumber(
  value: string,
  label: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new ConvexError(
      `${label} must use YYYY-MM-DD.`,
    );
  }

  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    throw new ConvexError(
      `${label} is not a valid calendar date.`,
    );
  }

  return Math.floor(
    date.getTime() /
      millisecondsPerDay,
  );
}

function validateGenerationWindow(
  fromLocalDate: string,
  throughLocalDate: string,
) {
  const fromDay =
    localDateDayNumber(
      fromLocalDate,
      'Generation start date',
    );

  const throughDay =
    localDateDayNumber(
      throughLocalDate,
      'Generation end date',
    );

  if (
    throughDay < fromDay
  ) {
    throw new ConvexError(
      'Generation end date cannot be before the start date.',
    );
  }

  if (
    throughDay - fromDay >
    3660
  ) {
    throw new ConvexError(
      'Occurrence generation window cannot exceed 3660 days.',
    );
  }
}

function determineInitialState(
  kind:
    Doc<'choreDefinitions'>['kind'],
  availabilityStartsAt: number,
  deadlineAt: number,
  now: number,
): Doc<'choreOccurrences'>['state'] {
  if (
    now <
    availabilityStartsAt
  ) {
    return 'scheduled';
  }

  if (
    kind ===
      'claimable' &&
    now >=
      deadlineAt
  ) {
    return 'expired_unclaimed';
  }

  /*
   * Personal submission AT deadline is
   * still legal, so "missed" begins only
   * strictly after deadlineAt.
   */
  if (
    kind ===
      'personal' &&
    now >
      deadlineAt
  ) {
    return 'missed';
  }

  return 'available';
}

export type GenerateOccurrencesResult = {
  householdId:
    Id<'households'>;

  fromLocalDate:
    string;

  throughLocalDate:
    string;

  activeDefinitionCount:
    number;

  createdCount:
    number;

  skippedExistingCount:
    number;
};

export async function generateOccurrencesForWindow(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  fromLocalDate: string,
  throughLocalDate: string,
  options:
    GenerationOptions = {},
): Promise<GenerateOccurrencesResult> {
  validateGenerationWindow(
    fromLocalDate,
    throughLocalDate,
  );

  const household =
    await ctx.db.get(
      householdId,
    );

  if (!household) {
    throw new ConvexError(
      'Household not found.',
    );
  }

  const definitions =
    (
      await ctx.db
        .query(
          'choreDefinitions',
        )
        .withIndex(
          'by_household',
          (q) =>
            q.eq(
              'householdId',
              householdId,
            ),
        )
        .collect()
    ).filter(
      (definition) =>
        definition.archivedAt ===
        undefined,
    );

  /*
   * "All Children" is resolved into
   * explicit IDs now.
   *
   * Children added later must not
   * silently become eligible for an
   * already-created occurrence.
   */
  const householdChildren =
    await ctx.db
      .query('children')
      .withIndex(
        'by_household',
        (q) =>
          q.eq(
            'householdId',
            householdId,
          ),
      )
      .collect();

  const allChildIds =
    householdChildren.map(
      (child) => child._id,
    );

  let createdCount = 0;

  let skippedExistingCount =
    0;

  const now =
    options.now ??
    Date.now();

  const scheduleTransitions =
    options.scheduleTransitions ??
    true;

  for (
    const definition of
    definitions
  ) {
    const scheduledDates =
      getScheduledLocalDates(
        definition.recurrence,
        fromLocalDate,
        throughLocalDate,
      );

    for (
      const scheduledLocalDate of
      scheduledDates
    ) {
      const existing =
        await ctx.db
          .query(
            'choreOccurrences',
          )
          .withIndex(
            'by_definition_scheduled_date',
            (q) =>
              q
                .eq(
                  'choreDefinitionId',
                  definition._id,
                )
                .eq(
                  'scheduledLocalDate',
                  scheduledLocalDate,
                ),
          )
          .unique();

      if (existing) {
        skippedExistingCount +=
          1;

        continue;
      }

      const schedule =
        resolveOccurrenceSchedule(
          {
            scheduledLocalDate,

            timezone:
              household.timezone,

            availabilityLocalTime:
              definition
                .availabilityLocalTime,

            deadlineLocalTime:
              definition
                .deadlineLocalTime,

            deadlineDayOffset:
              definition
                .deadlineDayOffset,
          },
        );

      let personalChildId:
        | Id<'children'>
        | undefined;

      let eligibleChildIds:
        | Id<'children'>[]
        | undefined;

      if (
        definition.kind ===
        'personal'
      ) {
        if (
          !definition.personalChildId
        ) {
          throw new ConvexError(
            `Personal Chore Definition ${definition._id} has no assigned Child.`,
          );
        }

        personalChildId =
          definition.personalChildId;
      } else {
        eligibleChildIds =
          definition
            .eligibleChildIds ===
          undefined
            ? [
                ...allChildIds,
              ]
            : [
                ...definition
                  .eligibleChildIds,
              ];
      }

      const state =
        determineInitialState(
          definition.kind,
          schedule
            .availabilityStartsAt,
          schedule.deadlineAt,
          now,
        );

      const commitmentLockAt =
        definition.kind ===
          'claimable'
          ? getClaimCommitmentLockAt(
              schedule.deadlineAt,
            )
          : null;

      const occurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definition._id,

            kind:
              definition.kind,

            title:
              definition.title,

            ...(definition.description !==
            undefined
              ? {
                  description:
                    definition.description,
                }
              : {}),

            valueSek:
              definition.valueSek,

            scheduledLocalDate,

            timezone:
              household.timezone,

            ...(definition
              .availabilityLocalTime !==
            undefined
              ? {
                  availabilityLocalTime:
                    definition
                      .availabilityLocalTime,
                }
              : {}),

            deadlineLocalTime:
              definition
                .deadlineLocalTime,

            deadlineDayOffset:
              definition
                .deadlineDayOffset,

            availabilityStartsAt:
              schedule
                .availabilityStartsAt,

            deadlineAt:
              schedule.deadlineAt,

            ...(commitmentLockAt !==
              null &&
            commitmentLockAt <=
              now
              ? {
                  commitmentLockReachedAt:
                    commitmentLockAt,
                }
              : {}),

            ...(personalChildId !==
            undefined
              ? {
                  personalChildId,
                }
              : {}),

            ...(eligibleChildIds !==
            undefined
              ? {
                  eligibleChildIds,
                }
              : {}),

            isUnlockChore:
              definition
                .isUnlockChore,

            state,

            createdAt:
              now,
          },
        );

      /*
       * TASK-18 notifications are advisory
       * scheduled side effects.
       *
       * Smoke generation disables
       * transition scheduling, so it also
       * avoids leaving notification jobs.
       */
      if (
        scheduleTransitions
      ) {
        await scheduleOccurrenceNotifications(
          ctx,
          occurrenceId,
          {
            now,
          },
        );
      }

      /*
       * Availability transition.
       */
      if (
        scheduleTransitions &&
        state ===
          'scheduled'
      ) {
        await ctx.scheduler.runAt(
          schedule
            .availabilityStartsAt,

          internal
            .jobs.occurrences.transitions
            .reconcile,

          {
            occurrenceId,
          },
        );
      }

      /*
       * Claim commitment lock boundary.
       *
       * This write does not change Chore or
       * Claim lifecycle state. It exists so
       * reactive clients receive an exact
       * database invalidation at the
       * two-hour commitment boundary.
       */
      if (
        scheduleTransitions &&
        definition.kind ===
          'claimable' &&
        commitmentLockAt !==
          null &&
        commitmentLockAt >
          now
      ) {
        await ctx.scheduler.runAt(
          commitmentLockAt,

          internal
            .jobs.claims.transitions
            .reconcileCommitmentLock,

          {
            occurrenceId,
          },
        );
      }

      /*
       * Claimable lifecycle has two exact
       * deadline reconciliations.
       *
       * 1. AT deadlineAt:
       *    a truly unclaimed occurrence
       *    becomes expired_unclaimed.
       *
       * 2. AT deadlineAt + 1:
       *    a still-owned, unsubmitted Claim
       *    becomes failed and receives its
       *    TASK-14 full-value penalty.
       *
       * Submission exactly at deadlineAt
       * remains valid.
       *
       * The second callback is harmless if
       * the first callback already expired
       * an unclaimed occurrence or if the
       * Child submitted on time.
       */
      if (
        scheduleTransitions &&
        definition.kind ===
          'claimable' &&
        state !==
          'expired_unclaimed' &&
        schedule.deadlineAt >
          now
      ) {
        await ctx.scheduler.runAt(
          schedule.deadlineAt,

          internal
            .jobs.occurrences.transitions
            .reconcile,

          {
            occurrenceId,
          },
        );

        await ctx.scheduler.runAt(
          schedule.deadlineAt +
            1,

          internal
            .jobs.occurrences.transitions
            .reconcile,

          {
            occurrenceId,
          },
        );
      }

      /*
       * Personal submission is allowed
       * exactly AT deadline.
       *
       * Therefore schedule its miss
       * reconciliation immediately
       * AFTER the deadline.
       */
      if (
        scheduleTransitions &&
        definition.kind ===
          'personal' &&
        state !==
          'missed' &&
        schedule.deadlineAt >=
          now
      ) {
        await ctx.scheduler.runAt(
          schedule.deadlineAt +
            1,

          internal
            .jobs.occurrences.transitions
            .reconcile,

          {
            occurrenceId,
          },
        );
      }

      createdCount +=
        1;
    }
  }

  return {
    householdId,

    fromLocalDate,

    throughLocalDate,

    activeDefinitionCount:
      definitions.length,

    createdCount,

    skippedExistingCount,
  };
}
