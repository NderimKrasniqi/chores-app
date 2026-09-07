import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
} from '../_generated/server';
import {
  addLocalDays,
} from './choreScheduling';
import {
  generateOccurrencesForWindow,
} from './choreOccurrenceGeneration';
import {
  reconcileOccurrenceLifecycle,
} from './choreOccurrenceLifecycle';
import {
  getLocalDateForInstant,
} from './householdTime';

export const
  occurrenceGenerationHorizonDays =
    14;

export type OccurrenceMaintenanceOptions = {
  now?: number;

  horizonDays?:
    number;

  scheduleTransitions?:
    boolean;

  householdIds?:
    Id<'households'>[];
};

export type OccurrenceMaintenanceResult = {
  householdCount:
    number;

  createdCount:
    number;

  skippedExistingCount:
    number;

  scheduledReconciledCount:
    number;

  claimableDeadlineReconciledCount:
    number;
};

function requireValidHorizon(
  horizonDays: number,
) {
  if (
    !Number.isSafeInteger(
      horizonDays,
    ) ||
    horizonDays < 0 ||
    horizonDays > 365
  ) {
    throw new Error(
      'Occurrence generation horizon must be a whole number from 0 through 365.',
    );
  }
}

export async function runOccurrenceMaintenance(
  ctx: MutationCtx,
  options:
    OccurrenceMaintenanceOptions = {},
): Promise<OccurrenceMaintenanceResult> {
  const now =
    options.now ??
    Date.now();

  const horizonDays =
    options.horizonDays ??
    occurrenceGenerationHorizonDays;

  const scheduleTransitions =
    options.scheduleTransitions ??
    true;

  requireValidHorizon(
    horizonDays,
  );

  const households =
    options.householdIds
      ? (
          await Promise.all(
            options
              .householdIds
              .map(
                (
                  householdId,
                ) =>
                  ctx.db.get(
                    householdId,
                  ),
              ),
          )
        ).filter(
          (
            household,
          ): household is NonNullable<
            typeof household
          > =>
            household !==
            null,
        )
      : await ctx.db
          .query(
            'households',
          )
          .collect();

  let createdCount = 0;

  let skippedExistingCount =
    0;

  for (
    const household of
    households
  ) {
    const todayLocal =
      getLocalDateForInstant(
        now,
        household.timezone,
      );

    const throughLocal =
      addLocalDays(
        todayLocal,
        horizonDays,
      );

    const generation =
      await generateOccurrencesForWindow(
        ctx,
        household._id,
        todayLocal,
        throughLocal,
        {
          now,

          scheduleTransitions,
        },
      );

    createdCount +=
      generation.createdCount;

    skippedExistingCount +=
      generation
        .skippedExistingCount;
  }

  /*
   * Safety net for a scheduled
   * availability transition whose
   * exact callback was delayed or
   * otherwise needs reconciliation.
   */
  const dueScheduled =
    await ctx.db
      .query(
        'choreOccurrences',
      )
      .withIndex(
        'by_state_availability',
        (q) =>
          q
            .eq(
              'state',
              'scheduled',
            )
            .lte(
              'availabilityStartsAt',
              now,
            ),
      )
      .collect();

  let scheduledReconciledCount =
    0;

  for (
    const occurrence of
    dueScheduled
  ) {
    const reconciliation =
      await reconcileOccurrenceLifecycle(
        ctx,
        occurrence._id,
        now,
      );

    if (
      reconciliation.changed
    ) {
      scheduledReconciledCount +=
        1;
    }
  }

  /*
   * Safety net for unresolved
   * Claimable occurrences whose
   * deadline has passed.
   *
   * Personal deadline behavior
   * belongs to TASK-08.
   */
  const dueAvailable =
    await ctx.db
      .query(
        'choreOccurrences',
      )
      .withIndex(
        'by_state_deadline',
        (q) =>
          q
            .eq(
              'state',
              'available',
            )
            .lte(
              'deadlineAt',
              now,
            ),
      )
      .collect();

  const dueClaimable =
    dueAvailable.filter(
      (occurrence) =>
        occurrence.kind ===
        'claimable',
    );

  let claimableDeadlineReconciledCount =
    0;

  for (
    const occurrence of
    dueClaimable
  ) {
    const reconciliation =
      await reconcileOccurrenceLifecycle(
        ctx,
        occurrence._id,
        now,
      );

    if (
      reconciliation.changed
    ) {
      claimableDeadlineReconciledCount +=
        1;
    }
  }

  return {
    householdCount:
      households.length,

    createdCount,

    skippedExistingCount,

    scheduledReconciledCount,

    claimableDeadlineReconciledCount,
  };
}
