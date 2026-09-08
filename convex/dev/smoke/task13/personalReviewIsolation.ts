import {
  internalMutation,
} from '../../../_generated/server';
import {
  rejectInitialSubmission,
} from '../../../lib/reviews/initialRejection';
import {
  listPendingPersonalReviews,
} from '../../../lib/reviews/personal';
import {
  submitPersonalRedo,
} from '../../../lib/redos/submission';
import {
  resolveLocalDateTimeToEpochMs,
} from '../../../lib/scheduling/choreScheduling';

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

export const run =
  internalMutation({
    args: {},

    handler: async (
      ctx,
    ) => {
      const timezone =
        'Europe/Stockholm';

      const availabilityStartsAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '10:00',
          timezone,
        );

      const originalDeadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '18:00',
          timezone,
        );

      const initialSubmittedAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '17:30',
          timezone,
        );

      const initialReviewAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '20:00',
          timezone,
        );

      const redoDeadlineLocalDate =
        '2030-01-17';

      const redoDeadlineLocalTime =
        '18:00';

      const redoSubmittedAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-17',
          '17:00',
          timezone,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK13 Personal review isolation smoke',

            timezone,

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt:
              initialSubmittedAt,

            updatedAt:
              initialSubmittedAt,
          },
        );

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Review Isolation Child',

            createdAt:
              initialSubmittedAt,

            updatedAt:
              initialSubmittedAt,
          },
        );

      const definitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'personal',

            title:
              'TASK13 review isolation',

            valueSek:
              90,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-16',
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task13-smoke',

            createdAt:
              initialSubmittedAt,

            updatedAt:
              initialSubmittedAt,
          },
        );

      const occurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definitionId,

            kind:
              'personal',

            title:
              'TASK13 review isolation',

            valueSek:
              90,

            scheduledLocalDate:
              '2030-01-16',

            timezone,

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt,

            deadlineAt:
              originalDeadlineAt,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            state:
              'submitted',

            createdAt:
              initialSubmittedAt,
          },
        );

      const initialSubmissionId =
        await ctx.db.insert(
          'choreSubmissions',
          {
            householdId,

            occurrenceId,

            childId,

            attemptNumber:
              1,

            submittedAt:
              initialSubmittedAt,
          },
        );

      await rejectInitialSubmission(
        ctx,
        initialSubmissionId,
        'task13-parent',
        'personal',
        redoDeadlineLocalDate,
        redoDeadlineLocalTime,
        initialReviewAt,
      );

      const redo =
        await submitPersonalRedo(
          ctx,
          occurrenceId,
          childId,
          redoSubmittedAt,
        );

      const pending =
        await listPendingPersonalReviews(
          ctx,
          householdId,
        );

      assert(
        !pending.some(
          (review) =>
            review.submissionId ===
            redo.submissionId,
        ),
        'Personal Redo attempt appeared in ordinary Personal review.',
      );

      assert(
        pending.length === 0,
        'Expected no ordinary Personal reviews after Redo submission.',
      );

      return {
        passed:
          true,

        redoSubmissionId:
          redo.submissionId,
      };
    },
  });
