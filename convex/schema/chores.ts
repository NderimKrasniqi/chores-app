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

export const choreTables = {
  choreDefinitions: defineTable({
    householdId: v.id('households'),

    kind: choreKindValidator,

    title: v.string(),

    description:
      v.optional(v.string()),

    // Positive whole SEK.
    valueSek: v.number(),

    recurrence:
      choreRecurrenceValidator,

    /*
     * Household-local HH:mm.
     * Undefined means start of scheduled local day.
     */
    availabilityLocalTime:
      v.optional(v.string()),

    // Household-local HH:mm.
    deadlineLocalTime: v.string(),

    /*
     * 0 = scheduled day.
     * 1 = following local calendar day, etc.
     */
    deadlineDayOffset: v.number(),

    /*
     * Required for Personal chores.
     */
    personalChildId:
      v.optional(v.id('children')),

    /*
     * Claimable:
     * undefined = all Children.
     * array = restricted Children.
     */
    eligibleChildIds:
      v.optional(
        v.array(v.id('children')),
      ),

    /*
     * Only recurring Personal chores can become
     * Unlock Chores.
     */
    isUnlockChore: v.boolean(),

    createdByAuthUserId: v.string(),

    createdAt: v.number(),
    updatedAt: v.number(),

    archivedAt:
      v.optional(v.number()),

    archivedByAuthUserId:
      v.optional(v.string()),
  })
    .index('by_household', ['householdId'])
    .index(
      'by_household_kind',
      ['householdId', 'kind'],
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
};
