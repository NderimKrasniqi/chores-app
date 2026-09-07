import {
  v,
} from 'convex/values';

import {
  internalMutation,
  internalQuery,
} from './_generated/server';
import {
  approveClaimableSubmission,
} from './lib/claimableChoreReview';
import {
  resolveLocalDateTimeToEpochMs,
} from './lib/choreScheduling';
import {
  rejectInitialSubmission,
} from './lib/initialChoreRejection';
import {
  approvePersonalSubmission,
} from './lib/personalChoreReview';

const choreKindValidator =
  v.union(
    v.literal(
      'personal',
    ),

    v.literal(
      'claimable',
    ),
  );

export const setup =
  internalMutation({
    args: {
      kind:
        choreKindValidator,
    },

    handler: async (
      ctx,
      args,
    ) => {
      const timezone =
        'Europe/Stockholm';

      const createdAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '10:00',
          timezone,
        );

      const deadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '18:00',
          timezone,
        );

      const submittedAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '17:30',
          timezone,
        );

      /*
       * Parent review may happen after
       * the original deadline because
       * persisted submittedAt is the
       * authoritative on-time fact.
       */
      const reviewAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '20:00',
          timezone,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              `TASK13 ${args.kind} review authority`,

            timezone,

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt,

            updatedAt:
              createdAt,
          },
        );

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Fixture Child',

            createdAt,

            updatedAt:
              createdAt,
          },
        );

      let definitionId;

      if (
        args.kind ===
        'personal'
      ) {
        definitionId =
          await ctx.db.insert(
            'choreDefinitions',
            {
              householdId,

              kind:
                'personal',

              title:
                'Concurrent Personal review',

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

              createdAt,

              updatedAt:
                createdAt,
            },
          );
      } else {
        definitionId =
          await ctx.db.insert(
            'choreDefinitions',
            {
              householdId,

              kind:
                'claimable',

              title:
                'Concurrent Claimable review',

              valueSek:
                140,

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

              eligibleChildIds:
                [
                  childId,
                ],

              isUnlockChore:
                false,

              createdByAuthUserId:
                'task13-smoke',

              createdAt,

              updatedAt:
                createdAt,
            },
          );
      }

      const occurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definitionId,

            kind:
              args.kind,

            title:
              args.kind ===
              'personal'
                ? 'Concurrent Personal review'
                : 'Concurrent Claimable review',

            valueSek:
              args.kind ===
              'personal'
                ? 90
                : 140,

            scheduledLocalDate:
              '2030-01-16',

            timezone,

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              createdAt,

            deadlineAt,

            ...(args.kind ===
            'personal'
              ? {
                  personalChildId:
                    childId,
                }
              : {
                  eligibleChildIds:
                    [
                      childId,
                    ],
                }),

            isUnlockChore:
              false,

            state:
              'submitted',

            createdAt,
          },
        );

      if (
        args.kind ===
        'claimable'
      ) {
        await ctx.db.insert(
          'choreClaims',
          {
            householdId,

            occurrenceId,

            childId,

            state:
              'submitted',

            claimedAt:
              resolveLocalDateTimeToEpochMs(
                '2030-01-16',
                '12:00',
                timezone,
              ),
          },
        );
      }

      const submissionId =
        await ctx.db.insert(
          'choreSubmissions',
          {
            householdId,

            occurrenceId,

            childId,

            attemptNumber:
              1,

            submittedAt,
          },
        );

      return {
        householdId,

        childId,

        definitionId,

        occurrenceId,

        submissionId,

        reviewAt,
      };
    },
  });

export const approve =
  internalMutation({
    args: {
      kind:
        choreKindValidator,

      submissionId:
        v.id(
          'choreSubmissions',
        ),

      now:
        v.number(),
    },

    handler: async (
      ctx,
      args,
    ) => {
      if (
        args.kind ===
        'personal'
      ) {
        return await approvePersonalSubmission(
          ctx,
          args.submissionId,
          'task13-parent-approve',
          args.now,
        );
      }

      return await approveClaimableSubmission(
        ctx,
        args.submissionId,
        'task13-parent-approve',
        args.now,
      );
    },
  });

export const reject =
  internalMutation({
    args: {
      kind:
        choreKindValidator,

      submissionId:
        v.id(
          'choreSubmissions',
        ),

      now:
        v.number(),
    },

    handler: async (
      ctx,
      args,
    ) => {
      return await rejectInitialSubmission(
        ctx,
        args.submissionId,
        'task13-parent-reject',
        args.kind,
        '2030-01-17',
        '18:00',
        args.now,
      );
    },
  });

export const inspect =
  internalQuery({
    args: {
      occurrenceId:
        v.id(
          'choreOccurrences',
        ),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const occurrence =
        await ctx.db.get(
          args.occurrenceId,
        );

      const reviews =
        await ctx.db
          .query(
            'choreReviews',
          )
          .withIndex(
            'by_occurrence',
            (q) =>
              q.eq(
                'occurrenceId',
                args.occurrenceId,
              ),
          )
          .collect();

      const redos =
        await ctx.db
          .query(
            'choreRedos',
          )
          .withIndex(
            'by_occurrence',
            (q) =>
              q.eq(
                'occurrenceId',
                args.occurrenceId,
              ),
          )
          .collect();

      const ledgerEntries =
        await ctx.db
          .query(
            'ledgerEntries',
          )
          .withIndex(
            'by_occurrence_kind',
            (q) =>
              q.eq(
                'occurrenceId',
                args.occurrenceId,
              ),
          )
          .collect();

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
                args.occurrenceId,
              ),
          )
          .collect();

      return {
        occurrenceState:
          occurrence?.state,

        reviewCount:
          reviews.length,

        reviewDecision:
          reviews[0]
            ?.decision,

        redoCount:
          redos.length,

        earningCount:
          ledgerEntries.filter(
            (entry) =>
              entry.kind ===
              'earning',
          ).length,

        claimState:
          claims[0]
            ?.state,
      };
    },
  });

export const cleanup =
  internalMutation({
    args: {
      householdId:
        v.id(
          'households',
        ),

      childId:
        v.id(
          'children',
        ),

      definitionId:
        v.id(
          'choreDefinitions',
        ),

      occurrenceId:
        v.id(
          'choreOccurrences',
        ),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const ledgerEntries =
        await ctx.db
          .query(
            'ledgerEntries',
          )
          .withIndex(
            'by_occurrence_kind',
            (q) =>
              q.eq(
                'occurrenceId',
                args.occurrenceId,
              ),
          )
          .collect();

      for (
        const entry of
        ledgerEntries
      ) {
        await ctx.db.delete(
          entry._id,
        );
      }

      const reviews =
        await ctx.db
          .query(
            'choreReviews',
          )
          .withIndex(
            'by_occurrence',
            (q) =>
              q.eq(
                'occurrenceId',
                args.occurrenceId,
              ),
          )
          .collect();

      for (
        const review of
        reviews
      ) {
        await ctx.db.delete(
          review._id,
        );
      }

      const redos =
        await ctx.db
          .query(
            'choreRedos',
          )
          .withIndex(
            'by_occurrence',
            (q) =>
              q.eq(
                'occurrenceId',
                args.occurrenceId,
              ),
          )
          .collect();

      for (
        const redo of
        redos
      ) {
        await ctx.db.delete(
          redo._id,
        );
      }

      const submissions =
        await ctx.db
          .query(
            'choreSubmissions',
          )
          .withIndex(
            'by_occurrence',
            (q) =>
              q.eq(
                'occurrenceId',
                args.occurrenceId,
              ),
          )
          .collect();

      for (
        const submission of
        submissions
      ) {
        await ctx.db.delete(
          submission._id,
        );
      }

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
                args.occurrenceId,
              ),
          )
          .collect();

      for (
        const claim of
        claims
      ) {
        await ctx.db.delete(
          claim._id,
        );
      }

      const occurrence =
        await ctx.db.get(
          args.occurrenceId,
        );

      if (occurrence) {
        await ctx.db.delete(
          occurrence._id,
        );
      }

      const definition =
        await ctx.db.get(
          args.definitionId,
        );

      if (definition) {
        await ctx.db.delete(
          definition._id,
        );
      }

      const child =
        await ctx.db.get(
          args.childId,
        );

      if (child) {
        await ctx.db.delete(
          child._id,
        );
      }

      const household =
        await ctx.db.get(
          args.householdId,
        );

      if (household) {
        await ctx.db.delete(
          household._id,
        );
      }
    },
  });
