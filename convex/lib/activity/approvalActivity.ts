import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';

export type ApprovalActivityItem = {
  activityId:
    Id<'choreReviews'>;

  childId:
    Id<'children'>;

  childDisplayName:
    string;

  choreTitle:
    string;

  choreKind:
    'personal' | 'claimable';

  valueSek:
    number;

  approvedAt:
    number;
};

const ACTIVITY_LIMIT =
  12;

const REVIEW_SCAN_LIMIT =
  100;

/*
 * Shared household activity is deliberately
 * derived from authoritative approved reviews
 * and their matching earning.
 *
 * It does NOT expose Ledger history, penalties,
 * payouts, or Running Balances.
 */
export async function listHouseholdApprovalActivity(
  ctx:
    | QueryCtx
    | MutationCtx,
  householdId:
    Id<'households'>,
) {
  const reviews =
    await ctx.db
      .query(
        'choreReviews',
      )
      .withIndex(
        'by_household_reviewed_at',
        (q) =>
          q.eq(
            'householdId',
            householdId,
          ),
      )
      .order(
        'desc',
      )
      .take(
        REVIEW_SCAN_LIMIT,
      );

  const items:
    ApprovalActivityItem[] =
    [];

  for (
    const review
    of reviews
  ) {
    if (
      review.decision !==
      'approved'
    ) {
      continue;
    }

    const submission =
      await ctx.db.get(
        review.submissionId,
      );

    const occurrence =
      await ctx.db.get(
        review.occurrenceId,
      );

    if (
      !submission ||
      !occurrence
    ) {
      continue;
    }

    if (
      submission.householdId !==
        householdId ||
      occurrence.householdId !==
        householdId ||
      submission.occurrenceId !==
        occurrence._id ||
      review.occurrenceId !==
        occurrence._id
    ) {
      continue;
    }

    const earning =
      await ctx.db
        .query(
          'ledgerEntries',
        )
        .withIndex(
          'by_occurrence_kind',
          (q) =>
            q
              .eq(
                'occurrenceId',
                occurrence._id,
              )
              .eq(
                'kind',
                'earning',
              ),
        )
        .unique();

    if (
      !earning ||
      earning.householdId !==
        householdId ||
      earning.childId !==
        submission.childId ||
      earning.reviewId !==
        review._id ||
      earning.amountSek !==
        occurrence.valueSek ||
      earning.amountSek <=
        0
    ) {
      continue;
    }

    const child =
      await ctx.db.get(
        submission.childId,
      );

    if (
      child &&
      child.householdId !==
        householdId
    ) {
      continue;
    }

    items.push({
      activityId:
        review._id,

      childId:
        submission.childId,

      childDisplayName:
        child
          ?.displayName ??
        'Child',

      choreTitle:
        occurrence.title,

      choreKind:
        occurrence.kind,

      valueSek:
        occurrence.valueSek,

      approvedAt:
        review.reviewedAt,
    });

    if (
      items.length >=
      ACTIVITY_LIMIT
    ) {
      break;
    }
  }

  return items;
}
