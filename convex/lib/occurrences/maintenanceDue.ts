import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';

export async function listDueScheduledOccurrences(
  ctx:
    MutationCtx,
  now:
    number,
  householdIds:
    | Id<'households'>[]
    | undefined,
) {
  if (
    householdIds ===
    undefined
  ) {
    return await ctx.db
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
  }

  const pages =
    await Promise.all(
      householdIds.map(
        (householdId) =>
          ctx.db
            .query(
              'choreOccurrences',
            )
            .withIndex(
              'by_household_state_availability',
              (q) =>
                q
                  .eq(
                    'householdId',
                    householdId,
                  )
                  .eq(
                    'state',
                    'scheduled',
                  )
                  .lte(
                    'availabilityStartsAt',
                    now,
                  ),
            )
            .collect(),
      ),
    );

  return pages.flat();
}

export async function listDueAvailableOccurrences(
  ctx:
    MutationCtx,
  now:
    number,
  householdIds:
    | Id<'households'>[]
    | undefined,
) {
  if (
    householdIds ===
    undefined
  ) {
    return await ctx.db
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
  }

  const kinds = [
    'personal',
    'claimable',
  ] as const;

  const pages =
    await Promise.all(
      householdIds.flatMap(
        (householdId) =>
          kinds.map(
            (kind) =>
              ctx.db
                .query(
                  'choreOccurrences',
                )
                .withIndex(
                  'by_household_kind_state_deadline',
                  (q) =>
                    q
                      .eq(
                        'householdId',
                        householdId,
                      )
                      .eq(
                        'kind',
                        kind,
                      )
                      .eq(
                        'state',
                        'available',
                      )
                      .lte(
                        'deadlineAt',
                        now,
                      ),
                )
                .collect(),
          ),
      ),
    );

  return pages.flat();
}
