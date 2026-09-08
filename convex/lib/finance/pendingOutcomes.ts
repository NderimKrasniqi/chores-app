import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';

export async function countPendingOutcomesForChild(
  ctx:
    MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
) {
  const [
    personalSubmitted,
    personalRedo,
    claimableSubmitted,
    claimableRedo,
  ] =
    await Promise.all([
      ctx.db
        .query(
          'choreOccurrences',
        )
        .withIndex(
          'by_personal_child_state_availability',
          (q) =>
            q
              .eq(
                'personalChildId',
                childId,
              )
              .eq(
                'state',
                'submitted',
              ),
        )
        .collect(),

      ctx.db
        .query(
          'choreOccurrences',
        )
        .withIndex(
          'by_personal_child_state_availability',
          (q) =>
            q
              .eq(
                'personalChildId',
                childId,
              )
              .eq(
                'state',
                'redo_required',
              ),
        )
        .collect(),

      ctx.db
        .query(
          'choreClaims',
        )
        .withIndex(
          'by_child_state',
          (q) =>
            q
              .eq(
                'childId',
                childId,
              )
              .eq(
                'state',
                'submitted',
              ),
        )
        .collect(),

      ctx.db
        .query(
          'choreClaims',
        )
        .withIndex(
          'by_child_state',
          (q) =>
            q
              .eq(
                'childId',
                childId,
              )
              .eq(
                'state',
                'redo_required',
              ),
        )
        .collect(),
    ]);

  const personalCount =
    [
      ...personalSubmitted,
      ...personalRedo,
    ].filter(
      (occurrence) =>
        occurrence.householdId ===
          householdId &&
        occurrence.kind ===
          'personal' &&
        occurrence.personalChildId ===
          childId,
    ).length;

  const claimableCount =
    [
      ...claimableSubmitted,
      ...claimableRedo,
    ].filter(
      (claim) =>
        claim.householdId ===
        householdId,
    ).length;

  return (
    personalCount +
    claimableCount
  );
}
