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
   * The fields below snapshot the definition and schedule
   * terms when this occurrence is created. Later edits to
   * the Chore Definition must never rewrite these values.
   */
  choreOccurrences: defineTable({
    householdId:
      v.id('households'),

    choreDefinitionId:
      v.id(
        'choreDefinitions',
      ),

    /*
     * Snapshot of Personal vs Claimable.
     */
    kind:
      choreKindValidator,

    /*
     * Display/value snapshot.
     */
    title:
      v.string(),

    description:
      v.optional(v.string()),

    // Positive whole SEK snapshot.
    valueSek:
      v.number(),

    /*
     * Household-local calendar date that this occurrence
     * represents, in YYYY-MM-DD form.
     */
    scheduledLocalDate:
      v.string(),

    /*
     * IANA Household Timezone used when the occurrence
     * was resolved.
     *
     * Changing the Household timezone later must not move
     * this occurrence.
     */
    timezone:
      v.string(),

    /*
     * Original Household-local schedule terms retained
     * for auditing/debugging.
     */
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

    /*
     * TASK-07 initially owns:
     *
     * scheduled -> available
     * available Claimable -> expired_unclaimed
     *
     * Later tasks add the submission/review transitions
     * already represented by this validator.
     */
    state:
      choreOccurrenceStateValidator,

    createdAt:
      v.number(),
  })
    /*
     * Idempotent generation key.
     *
     * A definition may create at most one occurrence for
     * a particular scheduled local calendar date.
     */
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
};
