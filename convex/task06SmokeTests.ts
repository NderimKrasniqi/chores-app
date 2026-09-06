import { v } from 'convex/values';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { action } from './_generated/server';

type SmokeTestResult = {
  label: string;
  passed: boolean;
  detail?: string;
};

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : String(error);
}

function errorContains(
  error: unknown,
  expected: string,
) {
  return getErrorMessage(
    error,
  ).includes(expected);
}

export const runTask06 =
  action({
    args: {
      householdId:
        v.id('households'),

      childId:
        v.id('children'),
    },

    handler: async (
      ctx,
      args,
    ): Promise<
      SmokeTestResult[]
    > => {
      if (
        process.env.APP_ENV ===
        'production'
      ) {
        throw new Error(
          'Developer smoke tests are disabled in production.',
        );
      }

      const results:
        SmokeTestResult[] = [];

      const createdIds:
        Id<'choreDefinitions'>[] =
        [];

      const suffix =
        Date.now().toString();

      let unlockId:
        | Id<'choreDefinitions'>
        | undefined;

      try {
        /*
         * 1. Claimable chore with
         * selected eligibility.
         */
        try {
          const id =
            await ctx.runMutation(
              api.choreDefinitions
                .create,
              {
                householdId:
                  args.householdId,

                kind:
                  'claimable',

                title:
                  `TEST Claimable ${suffix}`,

                valueSek: 30,

                recurrence: {
                  kind:
                    'weekly',

                  startDate:
                    '2030-01-01',

                  interval: 1,

                  weekdays: [
                    'monday',
                  ],
                },

                deadlineLocalTime:
                  '19:00',

                deadlineDayOffset:
                  0,

                eligibleChildIds: [
                  args.childId,
                ],

                isUnlockChore:
                  false,
              },
            );

          createdIds.push(
            id,
          );

          results.push({
            label:
              'Claimable selected eligibility',
            passed: true,
          });
        } catch (error) {
          results.push({
            label:
              'Claimable selected eligibility',
            passed: false,
            detail:
              getErrorMessage(
                error,
              ),
          });
        }

        /*
         * 2. Valid recurring
         * Personal Unlock Chore.
         */
        try {
          unlockId =
            await ctx.runMutation(
              api.choreDefinitions
                .create,
              {
                householdId:
                  args.householdId,

                kind:
                  'personal',

                title:
                  `TEST Unlock ${suffix}`,

                valueSek: 20,

                recurrence: {
                  kind:
                    'daily',

                  startDate:
                    '2030-01-01',

                  interval: 1,
                },

                deadlineLocalTime:
                  '18:00',

                deadlineDayOffset:
                  0,

                personalChildId:
                  args.childId,

                isUnlockChore:
                  true,
              },
            );

          createdIds.push(
            unlockId,
          );

          results.push({
            label:
              'Recurring Personal Unlock',
            passed: true,
          });
        } catch (error) {
          results.push({
            label:
              'Recurring Personal Unlock',
            passed: false,
            detail:
              getErrorMessage(
                error,
              ),
          });
        }

        /*
         * 3. Same Child cannot have
         * two active Unlock Chores.
         */
        if (unlockId) {
          try {
            const id =
              await ctx.runMutation(
                api.choreDefinitions
                  .create,
                {
                  householdId:
                    args.householdId,

                  kind:
                    'personal',

                  title:
                    `TEST Duplicate Unlock ${suffix}`,

                  valueSek: 25,

                  recurrence: {
                    kind:
                      'weekly',

                    startDate:
                      '2030-01-01',

                    interval: 1,

                    weekdays: [
                      'tuesday',
                    ],
                  },

                  deadlineLocalTime:
                    '18:00',

                  deadlineDayOffset:
                    0,

                  personalChildId:
                    args.childId,

                  isUnlockChore:
                    true,
                },
              );

            createdIds.push(
              id,
            );

            results.push({
              label:
                'Duplicate Unlock rejected',
              passed: false,
              detail:
                'Server allowed two active Unlock Chores.',
            });
          } catch (error) {
            results.push({
              label:
                'Duplicate Unlock rejected',
              passed:
                errorContains(
                  error,
                  'already has an active Unlock Chore',
                ),
              detail:
                getErrorMessage(
                  error,
                ),
            });
          }
        } else {
          results.push({
            label:
              'Duplicate Unlock rejected',
            passed: false,
            detail:
              'Skipped because the first Unlock Chore failed.',
          });
        }

        /*
         * 4. Unlock Chores must recur.
         */
        try {
          const id =
            await ctx.runMutation(
              api.choreDefinitions
                .create,
              {
                householdId:
                  args.householdId,

                kind:
                  'personal',

                title:
                  `TEST One-off Unlock ${suffix}`,

                valueSek: 20,

                recurrence: {
                  kind:
                    'one_off',

                  scheduledDate:
                    '2030-01-15',
                },

                deadlineLocalTime:
                  '18:00',

                deadlineDayOffset:
                  0,

                personalChildId:
                  args.childId,

                isUnlockChore:
                  true,
              },
            );

          createdIds.push(
            id,
          );

          results.push({
            label:
              'One-off Unlock rejected',
            passed: false,
            detail:
              'Server allowed a one-off Unlock Chore.',
          });
        } catch (error) {
          results.push({
            label:
              'One-off Unlock rejected',
            passed:
              errorContains(
                error,
                'must be recurring',
              ),
            detail:
              getErrorMessage(
                error,
              ),
          });
        }

        /*
         * 5. Value must be positive.
         */
        try {
          const id =
            await ctx.runMutation(
              api.choreDefinitions
                .create,
              {
                householdId:
                  args.householdId,

                kind:
                  'personal',

                title:
                  `TEST Zero Value ${suffix}`,

                valueSek: 0,

                recurrence: {
                  kind:
                    'one_off',

                  scheduledDate:
                    '2030-01-15',
                },

                deadlineLocalTime:
                  '18:00',

                deadlineDayOffset:
                  0,

                personalChildId:
                  args.childId,

                isUnlockChore:
                  false,
              },
            );

          createdIds.push(
            id,
          );

          results.push({
            label:
              'Zero SEK rejected',
            passed: false,
            detail:
              'Server allowed a 0 SEK chore.',
          });
        } catch (error) {
          results.push({
            label:
              'Zero SEK rejected',
            passed:
              errorContains(
                error,
                'positive whole number',
              ),
            detail:
              getErrorMessage(
                error,
              ),
          });
        }

        /*
         * 6. Value must be whole SEK.
         */
        try {
          const id =
            await ctx.runMutation(
              api.choreDefinitions
                .create,
              {
                householdId:
                  args.householdId,

                kind:
                  'personal',

                title:
                  `TEST Fractional Value ${suffix}`,

                valueSek: 12.5,

                recurrence: {
                  kind:
                    'one_off',

                  scheduledDate:
                    '2030-01-15',
                },

                deadlineLocalTime:
                  '18:00',

                deadlineDayOffset:
                  0,

                personalChildId:
                  args.childId,

                isUnlockChore:
                  false,
              },
            );

          createdIds.push(
            id,
          );

          results.push({
            label:
              'Fractional SEK rejected',
            passed: false,
            detail:
              'Server allowed a fractional SEK value.',
          });
        } catch (error) {
          results.push({
            label:
              'Fractional SEK rejected',
            passed:
              errorContains(
                error,
                'positive whole number',
              ),
            detail:
              getErrorMessage(
                error,
              ),
          });
        }

        /*
         * 7. Update can change a
         * Personal definition into
         * Claimable and clears fields
         * that no longer apply.
         */
        let updateTestId:
          | Id<'choreDefinitions'>
          | undefined;

        try {
          updateTestId =
            await ctx.runMutation(
              api.choreDefinitions
                .create,
              {
                householdId:
                  args.householdId,

                kind:
                  'personal',

                title:
                  `TEST Before Update ${suffix}`,

                description:
                  'This should be removed.',

                valueSek: 10,

                recurrence: {
                  kind:
                    'one_off',

                  scheduledDate:
                    '2030-02-01',
                },

                deadlineLocalTime:
                  '17:00',

                deadlineDayOffset:
                  0,

                personalChildId:
                  args.childId,

                isUnlockChore:
                  false,
              },
            );

          createdIds.push(
            updateTestId,
          );

          await ctx.runMutation(
            api.choreDefinitions
              .update,
            {
              choreDefinitionId:
                updateTestId,

              kind:
                'claimable',

              title:
                `TEST After Update ${suffix}`,

              valueSek: 45,

              recurrence: {
                kind:
                  'weekly',

                startDate:
                  '2030-02-01',

                interval: 2,

                weekdays: [
                  'wednesday',
                ],
              },

              deadlineLocalTime:
                '20:00',

              deadlineDayOffset:
                0,

              eligibleChildIds: [
                args.childId,
              ],

              isUnlockChore:
                false,
            },
          );

          const active =
            await ctx.runQuery(
              api.choreDefinitions
                .listActiveForHousehold,
              {
                householdId:
                  args.householdId,
              },
            );

          const updated =
            active.find(
              (definition) =>
                definition
                  .choreDefinitionId ===
                updateTestId,
            );

          const passed =
            updated !==
              undefined &&
            updated.kind ===
              'claimable' &&
            updated.title ===
              `TEST After Update ${suffix}` &&
            updated.valueSek ===
              45 &&
            updated.description ===
              undefined &&
            updated.personalChildId ===
              undefined &&
            updated.eligibleChildIds
              ?.length === 1 &&
            updated.eligibleChildIds[0] ===
              args.childId;

          results.push({
            label:
              'Update replaces incompatible fields',
            passed,
            ...(!passed
              ? {
                  detail:
                    'Updated definition did not match the expected Claimable state.',
                }
              : {}),
          });
        } catch (error) {
          results.push({
            label:
              'Update replaces incompatible fields',
            passed: false,
            detail:
              getErrorMessage(
                error,
              ),
          });
        }

        /*
         * 8. Archived definitions
         * disappear from the active list.
         */
        if (
          updateTestId
        ) {
          try {
            await ctx.runMutation(
              api.choreDefinitions
                .archive,
              {
                choreDefinitionId:
                  updateTestId,
              },
            );

            const active =
              await ctx.runQuery(
                api.choreDefinitions
                  .listActiveForHousehold,
                {
                  householdId:
                    args.householdId,
                },
              );

            const stillActive =
              active.some(
                (definition) =>
                  definition
                    .choreDefinitionId ===
                  updateTestId,
              );

            results.push({
              label:
                'Archive removes from active list',
              passed:
                !stillActive,
            });
          } catch (error) {
            results.push({
              label:
                'Archive removes from active list',
              passed: false,
              detail:
                getErrorMessage(
                  error,
                ),
            });
          }
        } else {
          results.push({
            label:
              'Archive removes from active list',
            passed: false,
            detail:
              'Skipped because the update test definition was not created.',
          });
        }

        /*
         * 9. Once an Unlock Chore is
         * archived, the Child may receive
         * a new active Unlock Chore.
         */
        if (unlockId) {
          try {
            await ctx.runMutation(
              api.choreDefinitions
                .archive,
              {
                choreDefinitionId:
                  unlockId,
              },
            );

            const replacementId =
              await ctx.runMutation(
                api.choreDefinitions
                  .create,
                {
                  householdId:
                    args.householdId,

                  kind:
                    'personal',

                  title:
                    `TEST Replacement Unlock ${suffix}`,

                  valueSek: 22,

                  recurrence: {
                    kind:
                      'weekly',

                    startDate:
                      '2030-03-01',

                    interval: 1,

                    weekdays: [
                      'friday',
                    ],
                  },

                  deadlineLocalTime:
                    '18:00',

                  deadlineDayOffset:
                    0,

                  personalChildId:
                    args.childId,

                  isUnlockChore:
                    true,
                },
              );

            createdIds.push(
              replacementId,
            );

            results.push({
              label:
                'Archived Unlock can be replaced',
              passed: true,
            });
          } catch (error) {
            results.push({
              label:
                'Archived Unlock can be replaced',
              passed: false,
              detail:
                getErrorMessage(
                  error,
                ),
            });
          }
        } else {
          results.push({
            label:
              'Archived Unlock can be replaced',
            passed: false,
            detail:
              'Skipped because the first Unlock Chore failed.',
          });
        }
      } finally {
        /*
         * 10. Archive any successful test
         * data that remains active.
         */
        let cleanupPassed =
          true;

        let cleanupDetail:
          | string
          | undefined;

        for (
          const id of
          createdIds
        ) {
          try {
            await ctx.runMutation(
              api.choreDefinitions
                .archive,
              {
                choreDefinitionId:
                  id,
              },
            );
          } catch (error) {
            cleanupPassed =
              false;

            cleanupDetail =
              getErrorMessage(
                error,
              );
          }
        }

        results.push({
          label:
            'Test data cleanup',
          passed:
            cleanupPassed,
          detail:
            cleanupDetail,
        });
      }

      return results;
    },
  });
