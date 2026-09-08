import { ConvexError, v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import type {
  MutationCtx,
} from './_generated/server';
import {
  mutation,
  query,
} from './_generated/server';
import {
  requireCurrentParentForHousehold,
} from './lib/auth/parentAuthorization';

const weekdayValidator = v.union(
  v.literal('monday'),
  v.literal('tuesday'),
  v.literal('wednesday'),
  v.literal('thursday'),
  v.literal('friday'),
  v.literal('saturday'),
  v.literal('sunday'),
);

const choreKindValidator = v.union(
  v.literal('personal'),
  v.literal('claimable'),
);

const choreRecurrenceValidator = v.union(
  v.object({
    kind: v.literal('one_off'),
    scheduledDate: v.string(),
  }),

  v.object({
    kind: v.literal('daily'),
    startDate: v.string(),
    interval: v.number(),
  }),

  v.object({
    kind: v.literal('weekly'),
    startDate: v.string(),
    interval: v.number(),
    weekdays: v.array(
      weekdayValidator,
    ),
  }),

  v.object({
    kind: v.literal('monthly'),
    startDate: v.string(),
    interval: v.number(),
    dayOfMonth: v.number(),
  }),
);

const activeChoreDefinitionValidator =
  v.object({
    choreDefinitionId:
      v.id(
        'choreDefinitions',
      ),

    kind:
      choreKindValidator,

    title:
      v.string(),

    description:
      v.optional(
        v.string(),
      ),

    valueSek:
      v.number(),

    recurrence:
      choreRecurrenceValidator,

    availabilityLocalTime:
      v.optional(
        v.string(),
      ),

    deadlineLocalTime:
      v.string(),

    deadlineDayOffset:
      v.number(),

    personalChildId:
      v.optional(
        v.id(
          'children',
        ),
      ),

    eligibleChildIds:
      v.optional(
        v.array(
          v.id(
            'children',
          ),
        ),
      ),

    isUnlockChore:
      v.boolean(),

    createdAt:
      v.number(),

    updatedAt:
      v.number(),
  });

type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type ChoreKind =
  | 'personal'
  | 'claimable';

type ChoreRecurrence =
  | {
      kind: 'one_off';
      scheduledDate: string;
    }
  | {
      kind: 'daily';
      startDate: string;
      interval: number;
    }
  | {
      kind: 'weekly';
      startDate: string;
      interval: number;
      weekdays: Weekday[];
    }
  | {
      kind: 'monthly';
      startDate: string;
      interval: number;
      dayOfMonth: number;
    };

type DefinitionInput = {
  householdId:
    Id<'households'>;

  kind: ChoreKind;

  title: string;

  description?:
    string;

  valueSek: number;

  recurrence:
    ChoreRecurrence;

  availabilityLocalTime?:
    string;

  deadlineLocalTime:
    string;

  deadlineDayOffset:
    number;

  personalChildId?:
    Id<'children'>;

  eligibleChildIds?:
    Id<'children'>[];

  isUnlockChore:
    boolean;
};

const weekdayOrder: Record<
  Weekday,
  number
> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

function normalizeTitle(
  value: string,
) {
  const title =
    value.trim();

  if (!title) {
    throw new ConvexError(
      'Chore title is required.',
    );
  }

  return title;
}

function normalizeDescription(
  value:
    | string
    | undefined,
) {
  if (
    value === undefined
  ) {
    return undefined;
  }

  const description =
    value.trim();

  return (
    description ||
    undefined
  );
}

function normalizeLocalDate(
  value: string,
  label: string,
) {
  const normalized =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
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
  ] = normalized
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

  return normalized;
}

function normalizeLocalTime(
  value: string,
  label: string,
) {
  const normalized =
    value.trim();

  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      normalized,
    )
  ) {
    throw new ConvexError(
      `${label} must use 24-hour HH:mm format.`,
    );
  }

  return normalized;
}

function localTimeToMinutes(
  value: string,
) {
  const [
    hours,
    minutes,
  ] = value
    .split(':')
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
}

function requirePositiveInterval(
  value: number,
) {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <= 0
  ) {
    throw new ConvexError(
      'Recurrence interval must be a positive whole number.',
    );
  }

  return value;
}

function normalizeRecurrence(
  recurrence:
    ChoreRecurrence,
): ChoreRecurrence {
  switch (
    recurrence.kind
  ) {
    case 'one_off':
      return {
        kind: 'one_off',
        scheduledDate:
          normalizeLocalDate(
            recurrence.scheduledDate,
            'Scheduled date',
          ),
      };

    case 'daily':
      return {
        kind: 'daily',
        startDate:
          normalizeLocalDate(
            recurrence.startDate,
            'Start date',
          ),
        interval:
          requirePositiveInterval(
            recurrence.interval,
          ),
      };

    case 'weekly': {
      if (
        recurrence.weekdays
          .length === 0
      ) {
        throw new ConvexError(
          'Weekly recurrence requires at least one weekday.',
        );
      }

      const uniqueWeekdays =
        Array.from(
          new Set(
            recurrence.weekdays,
          ),
        );

      if (
        uniqueWeekdays.length !==
        recurrence.weekdays
          .length
      ) {
        throw new ConvexError(
          'Weekly recurrence cannot contain duplicate weekdays.',
        );
      }

      uniqueWeekdays.sort(
        (
          left,
          right,
        ) =>
          weekdayOrder[left] -
          weekdayOrder[right],
      );

      return {
        kind: 'weekly',
        startDate:
          normalizeLocalDate(
            recurrence.startDate,
            'Start date',
          ),
        interval:
          requirePositiveInterval(
            recurrence.interval,
          ),
        weekdays:
          uniqueWeekdays,
      };
    }

    case 'monthly':
      if (
        !Number.isSafeInteger(
          recurrence.dayOfMonth,
        ) ||
        recurrence.dayOfMonth <
          1 ||
        recurrence.dayOfMonth >
          31
      ) {
        throw new ConvexError(
          'Monthly day must be between 1 and 31.',
        );
      }

      return {
        kind: 'monthly',
        startDate:
          normalizeLocalDate(
            recurrence.startDate,
            'Start date',
          ),
        interval:
          requirePositiveInterval(
            recurrence.interval,
          ),
        dayOfMonth:
          recurrence.dayOfMonth,
      };
  }
}

async function validateDefinitionInput(
  ctx: MutationCtx,
  args: DefinitionInput,
  excludeDefinitionId?:
    Id<'choreDefinitions'>,
) {
  const title =
    normalizeTitle(
      args.title,
    );

  const description =
    normalizeDescription(
      args.description,
    );

  if (
    !Number.isSafeInteger(
      args.valueSek,
    ) ||
    args.valueSek <= 0
  ) {
    throw new ConvexError(
      'Chore value must be a positive whole number of SEK.',
    );
  }

  const recurrence =
    normalizeRecurrence(
      args.recurrence,
    );

  const availabilityLocalTime =
    args.availabilityLocalTime ===
    undefined
      ? undefined
      : normalizeLocalTime(
          args.availabilityLocalTime,
          'Availability time',
        );

  const deadlineLocalTime =
    normalizeLocalTime(
      args.deadlineLocalTime,
      'Deadline time',
    );

  if (
    !Number.isSafeInteger(
      args.deadlineDayOffset,
    ) ||
    args.deadlineDayOffset <
      0
  ) {
    throw new ConvexError(
      'Deadline day offset must be a non-negative whole number.',
    );
  }

  const availabilityMinutes =
    availabilityLocalTime ===
    undefined
      ? 0
      : localTimeToMinutes(
          availabilityLocalTime,
        );

  const deadlineMinutes =
    localTimeToMinutes(
      deadlineLocalTime,
    ) +
    args.deadlineDayOffset *
      24 *
      60;

  if (
    deadlineMinutes <=
    availabilityMinutes
  ) {
    throw new ConvexError(
      'Deadline must be after the chore availability start.',
    );
  }

  let personalChildId:
    | Id<'children'>
    | undefined;

  let eligibleChildIds:
    | Id<'children'>[]
    | undefined;

  if (
    args.kind ===
    'personal'
  ) {
    if (
      !args.personalChildId
    ) {
      throw new ConvexError(
        'Personal chores must be assigned to a Child.',
      );
    }

    if (
      args.eligibleChildIds !==
      undefined
    ) {
      throw new ConvexError(
        'Personal chores cannot use Claimable eligibility.',
      );
    }

    const child =
      await ctx.db.get(
        args.personalChildId,
      );

    if (
      !child ||
      child.householdId !==
        args.householdId
    ) {
      throw new ConvexError(
        'Assigned Child does not belong to this household.',
      );
    }

    personalChildId =
      child._id;
  } else {
    if (
      args.personalChildId !==
      undefined
    ) {
      throw new ConvexError(
        'Claimable chores cannot have a Personal Child assignment.',
      );
    }

    if (
      args.eligibleChildIds !==
      undefined
    ) {
      if (
        args
          .eligibleChildIds
          .length === 0
      ) {
        throw new ConvexError(
          'Restricted Claimable eligibility must contain at least one Child.',
        );
      }

      const uniqueChildIds =
        Array.from(
          new Set(
            args
              .eligibleChildIds,
          ),
        );

      if (
        uniqueChildIds.length !==
        args
          .eligibleChildIds
          .length
      ) {
        throw new ConvexError(
          'Claimable eligibility cannot contain duplicate Children.',
        );
      }

      for (
        const childId of
        uniqueChildIds
      ) {
        const child =
          await ctx.db.get(
            childId,
          );

        if (
          !child ||
          child.householdId !==
            args.householdId
        ) {
          throw new ConvexError(
            'Every eligible Child must belong to this household.',
          );
        }
      }

      eligibleChildIds =
        uniqueChildIds;
    }
  }

  if (
    args.isUnlockChore
  ) {
    if (
      args.kind !==
      'personal'
    ) {
      throw new ConvexError(
        'Only Personal chores can be Unlock Chores.',
      );
    }

    if (
      recurrence.kind ===
      'one_off'
    ) {
      throw new ConvexError(
        'An Unlock Chore must be recurring.',
      );
    }

    if (
      !personalChildId
    ) {
      throw new ConvexError(
        'Unlock Chore requires an assigned Child.',
      );
    }

    const existingUnlocks =
      await ctx.db
        .query(
          'choreDefinitions',
        )
        .withIndex(
          'by_household_personal_child_unlock',
          (q) =>
            q
              .eq(
                'householdId',
                args.householdId,
              )
              .eq(
                'personalChildId',
                personalChildId,
              )
              .eq(
                'isUnlockChore',
                true,
              ),
        )
        .collect();

    const conflictingUnlock =
      existingUnlocks.find(
        (definition) =>
          definition.archivedAt ===
            undefined &&
          definition._id !==
            excludeDefinitionId,
      );

    if (
      conflictingUnlock
    ) {
      throw new ConvexError(
        'This Child already has an active Unlock Chore.',
      );
    }
  }

  return {
    title,
    description,
    valueSek:
      args.valueSek,
    recurrence,
    availabilityLocalTime,
    deadlineLocalTime,
    deadlineDayOffset:
      args.deadlineDayOffset,
    personalChildId,
    eligibleChildIds,
    isUnlockChore:
      args.isUnlockChore,
  };
}

export const create =
  mutation({
    args: {
      householdId:
        v.id(
          'households',
        ),

      kind:
        choreKindValidator,

      title:
        v.string(),

      description:
        v.optional(
          v.string(),
        ),

      valueSek:
        v.number(),

      recurrence:
        choreRecurrenceValidator,

      availabilityLocalTime:
        v.optional(
          v.string(),
        ),

      deadlineLocalTime:
        v.string(),

      deadlineDayOffset:
        v.number(),

      personalChildId:
        v.optional(
          v.id(
            'children',
          ),
        ),

      eligibleChildIds:
        v.optional(
          v.array(
            v.id(
              'children',
            ),
          ),
        ),

      isUnlockChore:
        v.boolean(),
    },

    returns:
      v.id(
        'choreDefinitions',
      ),

    handler: async (
      ctx,
      args,
    ) => {
      const { authUser } =
        await requireCurrentParentForHousehold(
          ctx,
          args.householdId,
        );

      const normalized =
        await validateDefinitionInput(
          ctx,
          args,
        );

      const now =
        Date.now();

      return await ctx.db.insert(
        'choreDefinitions',
        {
          householdId:
            args.householdId,

          kind:
            args.kind,

          title:
            normalized.title,

          description:
            normalized.description,

          valueSek:
            normalized.valueSek,

          recurrence:
            normalized.recurrence,

          availabilityLocalTime:
            normalized.availabilityLocalTime,

          deadlineLocalTime:
            normalized.deadlineLocalTime,

          deadlineDayOffset:
            normalized.deadlineDayOffset,

          personalChildId:
            normalized.personalChildId,

          eligibleChildIds:
            normalized.eligibleChildIds,

          isUnlockChore:
            normalized.isUnlockChore,

          createdByAuthUserId:
            authUser._id,

          createdAt:
            now,

          updatedAt:
            now,
        },
      );
    },
  });

export const update =
  mutation({
    args: {
      choreDefinitionId:
        v.id(
          'choreDefinitions',
        ),

      kind:
        choreKindValidator,

      title:
        v.string(),

      description:
        v.optional(
          v.string(),
        ),

      valueSek:
        v.number(),

      recurrence:
        choreRecurrenceValidator,

      availabilityLocalTime:
        v.optional(
          v.string(),
        ),

      deadlineLocalTime:
        v.string(),

      deadlineDayOffset:
        v.number(),

      personalChildId:
        v.optional(
          v.id(
            'children',
          ),
        ),

      eligibleChildIds:
        v.optional(
          v.array(
            v.id(
              'children',
            ),
          ),
        ),

      isUnlockChore:
        v.boolean(),
    },

    returns:
      v.id(
        'choreDefinitions',
      ),

    handler: async (
      ctx,
      args,
    ) => {
      const definition =
        await ctx.db.get(
          args.choreDefinitionId,
        );

      if (!definition) {
        throw new ConvexError(
          'Chore definition not found.',
        );
      }

      await requireCurrentParentForHousehold(
        ctx,
        definition.householdId,
      );

      if (
        definition.archivedAt !==
        undefined
      ) {
        throw new ConvexError(
          'Archived chore definitions cannot be edited.',
        );
      }

      const normalized =
        await validateDefinitionInput(
          ctx,
          {
            householdId:
              definition.householdId,

            kind:
              args.kind,

            title:
              args.title,

            description:
              args.description,

            valueSek:
              args.valueSek,

            recurrence:
              args.recurrence,

            availabilityLocalTime:
              args.availabilityLocalTime,

            deadlineLocalTime:
              args.deadlineLocalTime,

            deadlineDayOffset:
              args.deadlineDayOffset,

            personalChildId:
              args.personalChildId,

            eligibleChildIds:
              args.eligibleChildIds,

            isUnlockChore:
              args.isUnlockChore,
          },
          definition._id,
        );

      await ctx.db.patch(
        definition._id,
        {
          kind:
            args.kind,

          title:
            normalized.title,

          description:
            normalized.description,

          valueSek:
            normalized.valueSek,

          recurrence:
            normalized.recurrence,

          availabilityLocalTime:
            normalized.availabilityLocalTime,

          deadlineLocalTime:
            normalized.deadlineLocalTime,

          deadlineDayOffset:
            normalized.deadlineDayOffset,

          personalChildId:
            normalized.personalChildId,

          eligibleChildIds:
            normalized.eligibleChildIds,

          isUnlockChore:
            normalized.isUnlockChore,

          updatedAt:
            Date.now(),
        },
      );

      return definition._id;
    },
  });

export const archive =
  mutation({
    args: {
      choreDefinitionId:
        v.id(
          'choreDefinitions',
        ),
    },

    returns:
      v.boolean(),

    handler: async (
      ctx,
      args,
    ) => {
      const definition =
        await ctx.db.get(
          args.choreDefinitionId,
        );

      if (!definition) {
        throw new ConvexError(
          'Chore definition not found.',
        );
      }

      const { authUser } =
        await requireCurrentParentForHousehold(
          ctx,
          definition.householdId,
        );

      if (
        definition.archivedAt !==
        undefined
      ) {
        return false;
      }

      const now =
        Date.now();

      await ctx.db.patch(
        definition._id,
        {
          archivedAt:
            now,

          archivedByAuthUserId:
            authUser._id,

          updatedAt:
            now,
        },
      );

      return true;
    },
  });

export const listActiveForHousehold =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    returns:
      v.array(
        activeChoreDefinitionValidator,
      ),

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      const definitions =
        await ctx.db
          .query(
            'choreDefinitions',
          )
          .withIndex(
            'by_household',
            (q) =>
              q.eq(
                'householdId',
                args.householdId,
              ),
          )
          .collect();

      return definitions
        .filter(
          (definition) =>
            definition.archivedAt ===
            undefined,
        )
        .sort(
          (
            left,
            right,
          ) =>
            right.createdAt -
            left.createdAt,
        )
        .map(
          (definition) => ({
            choreDefinitionId:
              definition._id,

            kind:
              definition.kind,

            title:
              definition.title,

            description:
              definition.description,

            valueSek:
              definition.valueSek,

            recurrence:
              definition.recurrence,

            availabilityLocalTime:
              definition.availabilityLocalTime,

            deadlineLocalTime:
              definition.deadlineLocalTime,

            deadlineDayOffset:
              definition.deadlineDayOffset,

            personalChildId:
              definition.personalChildId,

            eligibleChildIds:
              definition.eligibleChildIds,

            isUnlockChore:
              definition.isUnlockChore,

            createdAt:
              definition.createdAt,

            updatedAt:
              definition.updatedAt,
          }),
        );
    },
  });
