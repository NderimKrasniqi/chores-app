import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';
import {
  addLocalDays,
} from '../scheduling/choreScheduling';
import {
  generateOccurrencesForWindow,
} from './generation';
import {
  reconcileOccurrenceLifecycle,
} from './lifecycle';
import {
  getLocalDateForInstant,
} from '../scheduling/householdTime';

export const
  occurrenceGenerationHorizonDays =
    14;

export type OccurrenceMaintenanceOptions = {
  now?: number;

  horizonDays?:
    number;

  scheduleTransitions?:
    boolean;

  /*
   * Optional scope used by deterministic
   * smoke tests.
   *
   * When supplied, BOTH generation and
   * lifecycle reconciliation must remain
   * inside these Households.
   */
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

  personalMissReconciledCount:
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

  /*
   * Smoke tests may provide a synthetic
   * clock far in the future.
   *
   * If householdIds was supplied, that
   * scope MUST also apply to lifecycle
   * reconciliation.
   *
   * Otherwise a test using 2030 could
   * accidentally reconcile real 2026
   * application data.
   */
  const householdScope =
    options.householdIds
      ? new Set(
          households.map(
            (household) =>
              household._id,
          ),
        )
      : null;

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
   * Safety net for delayed availability
   * callbacks.
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

  const scopedDueScheduled =
    householdScope
      ? dueScheduled.filter(
          (occurrence) =>
            householdScope.has(
              occurrence.householdId,
            ),
        )
      : dueScheduled;

  let scheduledReconciledCount =
    0;

  for (
    const occurrence of
    scopedDueScheduled
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
   * occurrences whose deadline has
   * arrived or passed.
   *
   * Claimable:
   * deadline boundary => expired.
   *
   * Personal:
   * strictly after deadline => missed.
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

  const scopedDueAvailable =
    householdScope
      ? dueAvailable.filter(
          (occurrence) =>
            householdScope.has(
              occurrence.householdId,
            ),
        )
      : dueAvailable;

  let claimableDeadlineReconciledCount =
    0;

  let personalMissReconciledCount =
    0;

  for (
    const occurrence of
    scopedDueAvailable
  ) {
    const reconciliation =
      await reconcileOccurrenceLifecycle(
        ctx,
        occurrence._id,
        now,
      );

    if (
      !reconciliation.changed
    ) {
      continue;
    }

    if (
      occurrence.kind ===
      'claimable'
    ) {
      claimableDeadlineReconciledCount +=
        1;
    } else {
      personalMissReconciledCount +=
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

    personalMissReconciledCount,
  };
}
