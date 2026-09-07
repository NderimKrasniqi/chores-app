import {
  defineTable,
} from 'convex/server';
import {
  v,
} from 'convex/values';

/*
 * Durable single-Redo opportunity.
 *
 * The original Chore Occurrence deadline
 * remains immutable.
 *
 * A first rejected on-time Submission may
 * create exactly one Redo record with a
 * new Parent-set deadline.
 *
 * Application mutations enforce at most
 * one Redo per Chore Occurrence.
 */
export const redoTables = {
  choreRedos: defineTable({
    householdId:
      v.id('households'),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    /*
     * The initial attempt-1 Submission
     * whose rejection created this Redo.
     */
    initialSubmissionId:
      v.id(
        'choreSubmissions',
      ),

    /*
     * The authoritative rejected Review
     * that created this Redo opportunity.
     */
    rejectionReviewId:
      v.id(
        'choreReviews',
      ),

    /*
     * Household-local deadline terms.
     *
     * Retaining both wall-clock terms and
     * the resolved absolute instant makes
     * the Redo deadline auditable without
     * depending on device timezone.
     */
    deadlineLocalDate:
      v.string(),

    deadlineLocalTime:
      v.string(),

    deadlineAt:
      v.number(),

    createdAt:
      v.number(),
  })
    .index(
      'by_occurrence',
      [
        'occurrenceId',
      ],
    )

    .index(
      'by_rejection_review',
      [
        'rejectionReviewId',
      ],
    )

    .index(
      'by_deadline',
      [
        'deadlineAt',
      ],
    )

    .index(
      'by_household_deadline',
      [
        'householdId',
        'deadlineAt',
      ],
    ),
};
