import {
  query,
} from './_generated/server';
import { requireCurrentChildAccess } from './lib/childAuthorization';

/*
 * Child-facing projection of durable
 * Redo facts.
 *
 * The original occurrence deadline stays
 * immutable. Child UI gets the active
 * Redo deadline from choreRedos instead.
 *
 * canSubmitRedo is advisory UI state only.
 * The submitRedo mutations independently
 * re-check every invariant.
 */
export const listMine =
  query({
    args: {},

    handler: async (
      ctx,
    ) => {
      const {
        child,
        household,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      const now =
        Date.now();

      const redos =
        await ctx.db
          .query(
            'choreRedos',
          )
          .withIndex(
            'by_household_deadline',
            (q) =>
              q.eq(
                'householdId',
                household._id,
              ),
          )
          .collect();

      const result = [];

      for (
        const redo of
        redos
      ) {
        const initialSubmission =
          await ctx.db.get(
            redo.initialSubmissionId,
          );

        if (
          !initialSubmission ||
          initialSubmission.childId !==
            child._id
        ) {
          continue;
        }

        const occurrence =
          await ctx.db.get(
            redo.occurrenceId,
          );

        if (
          !occurrence ||
          occurrence.householdId !==
            household._id
        ) {
          continue;
        }

        const attemptTwo =
          await ctx.db
            .query(
              'choreSubmissions',
            )
            .withIndex(
              'by_occurrence_attempt',
              (q) =>
                q
                  .eq(
                    'occurrenceId',
                    redo.occurrenceId,
                  )
                  .eq(
                    'attemptNumber',
                    2,
                  ),
            )
            .unique();

        result.push({
          redoId:
            redo._id,

          occurrenceId:
            redo.occurrenceId,

          kind:
            occurrence.kind,

          deadlineAt:
            redo.deadlineAt,

          deadlineLocalDate:
            redo.deadlineLocalDate,

          deadlineLocalTime:
            redo.deadlineLocalTime,

          timezone:
            occurrence.timezone,

          occurrenceState:
            occurrence.state,

          canSubmitRedo:
            occurrence.state ===
              'redo_required' &&
            attemptTwo ===
              null &&
            now >=
              redo.createdAt &&
            now <=
              redo.deadlineAt,
        });
      }

      return result.sort(
        (
          left,
          right,
        ) =>
          left.deadlineAt -
          right.deadlineAt,
      );
    },
  });
