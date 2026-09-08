import { defineTable } from 'convex/server';
import { v } from 'convex/values';

import { weekdayValidator } from './households';

const choreKindValidator = v.union(
  v.literal('personal'),
  v.literal('claimable'),
);

const choreRecurrenceValidator = v.union(
  v.object({
    kind: v.literal('one_off'),

    // Household-local YYYY-MM-DD.
    scheduledDate: v.string(),
  }),

  v.object({
    kind: v.literal('daily'),

    // Household-local YYYY-MM-DD.
    startDate: v.string(),

    // Every N days.
    interval: v.number(),
  }),

  v.object({
    kind: v.literal('weekly'),

    // Household-local YYYY-MM-DD.
    startDate: v.string(),

    // Every N weeks.
    interval: v.number(),

    weekdays: v.array(
      weekdayValidator,
    ),
  }),

  v.object({
    kind: v.literal('monthly'),

    // Household-local YYYY-MM-DD.
    startDate: v.string(),

    // Every N months.
    interval: v.number(),

    // 1-31.
    dayOfMonth: v.number(),
  }),
);

const choreOccurrenceStateValidator =
  v.union(
    v.literal('scheduled'),
    v.literal('available'),
    v.literal('submitted'),
    v.literal('redo_required'),
    v.literal('approved'),
    v.literal('missed'),
    v.literal('failed'),
    v.literal('cancelled'),
    v.literal(
      'expired_unclaimed',
    ),
  );

const choreReviewDecisionValidator =
  v.union(
    v.literal('approved'),
    v.literal('rejected'),
  );

const ledgerEntryKindValidator =
  v.union(
    v.literal('earning'),
    v.literal('penalty'),
  );

export const choreTables = {
  /*
   * Durable Parent-authored template.
   *
   * Editing or archiving a definition affects future
   * occurrence generation only.
   */
  choreDefinitions: defineTable({
    householdId:
      v.id('households'),

    kind:
      choreKindValidator,

    title:
      v.string(),

    description:
      v.optional(v.string()),

    // Positive whole SEK.
    valueSek:
      v.number(),

    recurrence:
      choreRecurrenceValidator,

    /*
     * Household-local HH:mm.
     *
     * Undefined means start of the scheduled local day.
     */
    availabilityLocalTime:
      v.optional(v.string()),

    // Household-local HH:mm.
    deadlineLocalTime:
      v.string(),

    /*
     * 0 = scheduled day.
     * 1 = following local calendar day, etc.
     */
    deadlineDayOffset:
      v.number(),

    /*
     * Required for Personal chores.
     */
    personalChildId:
      v.optional(
        v.id('children'),
      ),

    /*
     * Claimable:
     * undefined = all Children.
     * array = restricted Children.
     */
    eligibleChildIds:
      v.optional(
        v.array(
          v.id('children'),
        ),
      ),

    /*
     * Only recurring Personal chores can become
     * Unlock Chores.
     */
    isUnlockChore:
      v.boolean(),

    createdByAuthUserId:
      v.string(),

    createdAt:
      v.number(),

    updatedAt:
      v.number(),

    archivedAt:
      v.optional(v.number()),

    archivedByAuthUserId:
      v.optional(v.string()),
  })
    .index(
      'by_household',
      ['householdId'],
    )
    .index(
      'by_household_kind',
      [
        'householdId',
        'kind',
      ],
    )
    .index(
      'by_household_personal_child',
      [
        'householdId',
        'personalChildId',
      ],
    )
    .index(
      'by_household_personal_child_unlock',
      [
        'householdId',
        'personalChildId',
        'isUnlockChore',
      ],
    ),

  /*
   * Concrete scheduled instance of a Chore Definition.
   *
   * Definition and schedule terms are snapshotted when
   * this occurrence is created.
   */
  choreOccurrences: defineTable({
    householdId:
      v.id('households'),

    choreDefinitionId:
      v.id(
        'choreDefinitions',
      ),

    kind:
      choreKindValidator,

    title:
      v.string(),

    description:
      v.optional(v.string()),

    // Positive whole SEK snapshot.
    valueSek:
      v.number(),

    /*
     * Household-local YYYY-MM-DD.
     */
    scheduledLocalDate:
      v.string(),

    /*
     * IANA Household Timezone used when this occurrence
     * was generated.
     */
    timezone:
      v.string(),

    availabilityLocalTime:
      v.optional(v.string()),

    deadlineLocalTime:
      v.string(),

    deadlineDayOffset:
      v.number(),

    /*
     * Immutable absolute UTC instants represented as
     * Unix epoch milliseconds.
     */
    availabilityStartsAt:
      v.number(),

    deadlineAt:
      v.number(),

    /*
     * Assignment and eligibility snapshots.
     */
    personalChildId:
      v.optional(
        v.id('children'),
      ),

    eligibleChildIds:
      v.optional(
        v.array(
          v.id('children'),
        ),
      ),

    isUnlockChore:
      v.boolean(),

    state:
      choreOccurrenceStateValidator,

    createdAt:
      v.number(),
  })
    .index(
      'by_definition_scheduled_date',
      [
        'choreDefinitionId',
        'scheduledLocalDate',
      ],
    )
    .index(
      'by_household',
      ['householdId'],
    )
    .index(
      'by_household_availability',
      [
        'householdId',
        'availabilityStartsAt',
      ],
    )
    .index(
      'by_state_availability',
      [
        'state',
        'availabilityStartsAt',
      ],
    )
    .index(
      'by_state_deadline',
      [
        'state',
        'deadlineAt',
      ],
    )
    .index(
      'by_personal_child_availability',
      [
        'personalChildId',
        'availabilityStartsAt',
      ],
    ),

  /*
   * Child declaration that work is complete.
   *
   * Submission itself has no financial effect.
   * Parent approval is required before an earning exists.
   *
   * attemptNumber is introduced now so TASK-13 can add
   * the single-redo flow without rewriting submission
   * history.
   *
   * TASK-08 creates attempt 1 only.
   */
  choreSubmissions: defineTable({
    householdId:
      v.id('households'),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id('children'),

    /*
     * TASK-08 requires 1.
     * TASK-13 may later use 2 for the single redo.
     */
    attemptNumber:
      v.number(),

    /*
     * Authoritative Convex server timestamp.
     *
     * This timestamp determines whether submission was
     * on time. Device timestamps are never authoritative.
     */
    submittedAt:
      v.number(),

    /*
     * Optional private TASK-16 photo.
     *
     * The storage ID is never exposed as
     * a public file URL.
     */
    evidenceStorageId:
      v.optional(
        v.id('_storage'),
      ),
  })
    .index(
      'by_occurrence',
      ['occurrenceId'],
    )
    .index(
      'by_occurrence_attempt',
      [
        'occurrenceId',
        'attemptNumber',
      ],
    )
    .index(
      'by_child_submitted_at',
      [
        'childId',
        'submittedAt',
      ],
    )
    .index(
      'by_household_submitted_at',
      [
        'householdId',
        'submittedAt',
      ],
    ),

  /*
   * Immutable Parent review decision.
   *
   * TASK-08 initially exposes approval for Personal
   * Chores. The rejected value is represented now so
   * TASK-13 can extend the same durable review model
   * into redo handling.
   *
   * Application mutations enforce at most one successful
   * review per Submission.
   */
  choreReviews: defineTable({
    householdId:
      v.id('households'),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    submissionId:
      v.id(
        'choreSubmissions',
      ),

    decision:
      choreReviewDecisionValidator,

    // Better Auth Parent user ID.
    reviewedByAuthUserId:
      v.string(),

    reviewedAt:
      v.number(),
  })
    .index(
      'by_submission',
      ['submissionId'],
    )
    .index(
      'by_occurrence',
      ['occurrenceId'],
    )
    .index(
      'by_household_reviewed_at',
      [
        'householdId',
        'reviewedAt',
      ],
    ),

  /*
   * Immutable financial effects.
   *
   * TASK-08 creates positive earning entries only.
   * TASK-14 will later create negative penalty entries.
   *
   * Running Balance is derived from these entries rather
   * than stored as a mutable total.
   */
  ledgerEntries: defineTable({
    householdId:
      v.id('households'),

    childId:
      v.id('children'),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    /*
     * Earnings come from an approved review.
     * Penalties added in later tasks need not have one.
     */
    reviewId:
      v.optional(
        v.id(
          'choreReviews',
        ),
      ),

    kind:
      ledgerEntryKindValidator,

    /*
     * Whole SEK.
     *
     * earning => positive
     * penalty => negative
     *
     * Mutations enforce those sign rules.
     */
    amountSek:
      v.number(),

    createdAt:
      v.number(),
  })
    .index(
      'by_occurrence_kind',
      [
        'occurrenceId',
        'kind',
      ],
    )
    .index(
      'by_child_created_at',
      [
        'childId',
        'createdAt',
      ],
    )
    .index(
      'by_household_created_at',
      [
        'householdId',
        'createdAt',
      ],
    ),
};
