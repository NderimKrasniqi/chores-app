import {
  v,
} from 'convex/values';

import type {
  Id,
} from './_generated/dataModel';
import {
  query,
} from './_generated/server';
import { requireCurrentParentForHousehold } from './lib/auth/parentAuthorization';

type PendingRedoReview = {
  submissionId:
    Id<'choreSubmissions'>;

  occurrenceId:
    Id<'choreOccurrences'>;

  childId:
    Id<'children'>;

  kind:
    'personal' |
    'claimable';

  childDisplayName:
    string;

  title:
    string;

  description?:
    string;

  valueSek:
    number;

  submittedAt:
    number;

  redoDeadlineAt:
    number;

  timezone:
    string;

  isUnlockChore:
    boolean;

  hasEvidence:
    boolean;
};

/*
 * Parent-facing projection for attempt-2
 * submissions awaiting their final review.
 *
 * Review delay never invalidates an
 * on-time Redo. The persisted submittedAt
 * is compared with the durable Redo
 * deadline, not Date.now().
 */
export const listPending =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      const submissions =
        await ctx.db
          .query(
            'choreSubmissions',
          )
          .withIndex(
            'by_household_submitted_at',
            (q) =>
              q.eq(
                'householdId',
                args.householdId,
              ),
          )
          .collect();

      const pending:
        PendingRedoReview[] =
        [];

      for (
        const submission of
        submissions
      ) {
        if (
          submission.attemptNumber !==
          2
        ) {
          continue;
        }

        const existingReview =
          await ctx.db
            .query(
              'choreReviews',
            )
            .withIndex(
              'by_submission',
              (q) =>
                q.eq(
                  'submissionId',
                  submission._id,
                ),
            )
            .unique();

        if (existingReview) {
          continue;
        }

        const occurrence =
          await ctx.db.get(
            submission.occurrenceId,
          );

        if (
          !occurrence ||
          occurrence.householdId !==
            args.householdId ||
          occurrence.state !==
            'submitted' ||
          (
            occurrence.kind !==
              'personal' &&
            occurrence.kind !==
              'claimable'
          )
        ) {
          continue;
        }

        const redo =
          await ctx.db
            .query(
              'choreRedos',
            )
            .withIndex(
              'by_occurrence',
              (q) =>
                q.eq(
                  'occurrenceId',
                  occurrence._id,
                ),
            )
            .unique();

        if (
          !redo ||
          submission.submittedAt >
            redo.deadlineAt
        ) {
          continue;
        }

        const child =
          await ctx.db.get(
            submission.childId,
          );

        if (
          !child ||
          child.householdId !==
            args.householdId
        ) {
          continue;
        }

        if (
          occurrence.kind ===
          'claimable'
        ) {
          const claims =
            await ctx.db
              .query(
                'choreClaims',
              )
              .withIndex(
                'by_occurrence',
                (q) =>
                  q.eq(
                    'occurrenceId',
                    occurrence._id,
                  ),
              )
              .collect();

          const submittedClaim =
            claims.find(
              (claim) =>
                claim.childId ===
                  child._id &&
                claim.state ===
                  'submitted',
            );

          if (!submittedClaim) {
            continue;
          }
        }

        pending.push({
          submissionId:
            submission._id,

          occurrenceId:
            occurrence._id,

          childId:
            child._id,

          kind:
            occurrence.kind,

          childDisplayName:
            child.displayName,

          title:
            occurrence.title,

          description:
            occurrence.description,

          valueSek:
            occurrence.valueSek,

          submittedAt:
            submission.submittedAt,

          redoDeadlineAt:
            redo.deadlineAt,

          timezone:
            occurrence.timezone,

          isUnlockChore:
            occurrence.isUnlockChore,

          hasEvidence:
            submission
              .evidenceStorageId !==
            undefined,
        });
      }

      return pending.sort(
        (
          left,
          right,
        ) =>
          left.submittedAt -
          right.submittedAt,
      );
    },
  });
