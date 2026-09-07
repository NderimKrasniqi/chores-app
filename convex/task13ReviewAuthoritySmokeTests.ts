import {
  internal,
} from './_generated/api';
import {
  action,
} from './_generated/server';

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
  action({
    args: {},

    handler: async (
      ctx,
    ) => {
      let passed =
        0;

      const kinds =
        [
          'personal',
          'claimable',
        ] as const;

      for (
        const kind of
        kinds
      ) {
        const fixture =
          await ctx.runMutation(
            internal
              .task13ReviewAuthorityFixtures
              .setup,
            {
              kind,
            },
          );

        try {
          /*
           * These are separate Convex
           * transactions intentionally
           * issued together.
           *
           * Both start from the same
           * unresolved Submission.
           */
          const race =
            await Promise.allSettled(
              [
                ctx.runMutation(
                  internal
                    .task13ReviewAuthorityFixtures
                    .approve,
                  {
                    kind,

                    submissionId:
                      fixture
                        .submissionId,

                    now:
                      fixture
                        .reviewAt,
                  },
                ),

                ctx.runMutation(
                  internal
                    .task13ReviewAuthorityFixtures
                    .reject,
                  {
                    kind,

                    submissionId:
                      fixture
                        .submissionId,

                    now:
                      fixture
                        .reviewAt,
                  },
                ),
              ],
            );

          const fulfilledCount =
            race.filter(
              (result) =>
                result.status ===
                'fulfilled',
            ).length;

          const rejectedCount =
            race.filter(
              (result) =>
                result.status ===
                'rejected',
            ).length;

          assert(
            fulfilledCount ===
              1 &&
            rejectedCount ===
              1,
            `${kind}: exactly one concurrent Parent decision must succeed.`,
          );

          passed += 1;

          console.log(
            `✅ ${passed}/8 ${kind}: exactly one concurrent decision succeeds`,
          );

          const snapshot =
            await ctx.runQuery(
              internal
                .task13ReviewAuthorityFixtures
                .inspect,
              {
                occurrenceId:
                  fixture
                    .occurrenceId,
              },
            );

          assert(
            snapshot.reviewCount ===
              1,
            `${kind}: concurrent review race must persist exactly one Review.`,
          );

          passed += 1;

          console.log(
            `✅ ${passed}/8 ${kind}: exactly one authoritative Review is durable`,
          );

          if (
            snapshot.reviewDecision ===
            'approved'
          ) {
            assert(
              snapshot.occurrenceState ===
                'approved' &&
              snapshot.earningCount ===
                1 &&
              snapshot.redoCount ===
                0 &&
              (
                kind ===
                  'personal' ||
                snapshot.claimState ===
                  'approved'
              ),
              `${kind}: approved winner must be the sole resulting domain outcome.`,
            );
          } else {
            assert(
              snapshot.reviewDecision ===
                'rejected' &&
              snapshot.occurrenceState ===
                'redo_required' &&
              snapshot.earningCount ===
                0 &&
              snapshot.redoCount ===
                1 &&
              (
                kind ===
                  'personal' ||
                snapshot.claimState ===
                  'redo_required'
              ),
              `${kind}: rejected winner must be the sole resulting domain outcome.`,
            );
          }

          passed += 1;

          console.log(
            `✅ ${passed}/8 ${kind}: winner exclusively determines lifecycle and finance`,
          );

          /*
           * Prove the losing conflicting
           * decision cannot later overwrite
           * the first successful one.
           */
          let laterConflictFailed =
            false;

          try {
            if (
              snapshot.reviewDecision ===
              'approved'
            ) {
              await ctx.runMutation(
                internal
                  .task13ReviewAuthorityFixtures
                  .reject,
                {
                  kind,

                  submissionId:
                    fixture
                      .submissionId,

                  now:
                    fixture
                      .reviewAt +
                    1,
                },
              );
            } else {
              await ctx.runMutation(
                internal
                  .task13ReviewAuthorityFixtures
                  .approve,
                {
                  kind,

                  submissionId:
                    fixture
                      .submissionId,

                  now:
                    fixture
                      .reviewAt +
                    1,
                },
              );
            }
          } catch {
            laterConflictFailed =
              true;
          }

          assert(
            laterConflictFailed,
            `${kind}: later conflicting review attempt must fail.`,
          );

          const afterConflict =
            await ctx.runQuery(
              internal
                .task13ReviewAuthorityFixtures
                .inspect,
              {
                occurrenceId:
                  fixture
                    .occurrenceId,
              },
            );

          assert(
            afterConflict.reviewCount ===
              snapshot.reviewCount &&
            afterConflict.reviewDecision ===
              snapshot.reviewDecision &&
            afterConflict.occurrenceState ===
              snapshot.occurrenceState &&
            afterConflict.earningCount ===
              snapshot.earningCount &&
            afterConflict.redoCount ===
              snapshot.redoCount &&
            afterConflict.claimState ===
              snapshot.claimState,
            `${kind}: later conflicting review must have no domain effect.`,
          );

          passed += 1;

          console.log(
            `✅ ${passed}/8 ${kind}: later conflicting decision cannot overwrite winner`,
          );
        } finally {
          await ctx.runMutation(
            internal
              .task13ReviewAuthorityFixtures
              .cleanup,
            {
              householdId:
                fixture
                  .householdId,

              childId:
                fixture
                  .childId,

              definitionId:
                fixture
                  .definitionId,

              occurrenceId:
                fixture
                  .occurrenceId,
            },
          );
        }
      }

      return {
        passed,

        total:
          8,
      };
    },
  });
