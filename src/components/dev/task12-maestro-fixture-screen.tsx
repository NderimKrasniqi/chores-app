import {
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
} from 'react-native';

import type {
  Id,
} from '../../../convex/_generated/dataModel';
import {
  ClaimableChoresView,
  type ClaimableChoresViewModel,
} from '../chores/claimable-chores-view';

const CHILD_ID =
  'maestro-task12-child' as Id<'children'>;

const GARAGE_OCCURRENCE_ID =
  'maestro-task12-garage-occurrence' as Id<'choreOccurrences'>;

const GARAGE_CLAIM_ID =
  'maestro-task12-garage-claim' as Id<'choreClaims'>;

const WINDOWS_OCCURRENCE_ID =
  'maestro-task12-windows-occurrence' as Id<'choreOccurrences'>;

const deadlineAt =
  Date.UTC(
    2030,
    0,
    15,
    18,
    0,
    0,
  );

const lockAt =
  deadlineAt -
  2 *
    60 *
    60 *
    1000;

const commitment = {
  lockAt,

  isTimeLocked:
    false,

  hasUnclaimAllowance:
    true,

  remainingUnclaims:
    2,

  canUnclaim:
    true,

  isImmediatelyLocked:
    false,

  lockReason:
    null,
} as const;

type FixtureClaimState =
  | 'none'
  | 'claimed'
  | 'submitted';

export function Task12MaestroFixtureScreen() {
  const [
    claimState,
    setClaimState,
  ] =
    useState<FixtureClaimState>(
      'none',
    );

  function reset() {
    setClaimState(
      'none',
    );
  }

  const claimableOccurrences:
    ClaimableChoresViewModel['claimableOccurrences'] =
    [];

  if (
    claimState ===
    'none'
  ) {
    claimableOccurrences.push({
      occurrenceId:
        GARAGE_OCCURRENCE_ID,

      title:
        'Garage shelves',

      description:
        'Organize the garage shelves.',

      valueSek:
        140,

      timezone:
        'Europe/Stockholm',

      deadlineAt,

      commitment,
    });
  }

  /*
   * Keep another eligible Claimable Chore
   * visible throughout the fixture.
   *
   * Once Garage shelves is claimed or
   * submitted, production presentation
   * must disable this second Claim because
   * the Child still owns an unresolved
   * active Claim.
   */
  claimableOccurrences.push({
    occurrenceId:
      WINDOWS_OCCURRENCE_ID,

    title:
      'Clean windows',

    description:
      'Clean the downstairs windows.',

    valueSek:
      110,

    timezone:
      'Europe/Stockholm',

    deadlineAt,

    commitment,
  });

  const claimedOccurrences:
    ClaimableChoresViewModel['claimedOccurrences'] =
    claimState ===
    'none'
      ? []
      : [
          {
            claimId:
              GARAGE_CLAIM_ID,

            occurrenceId:
              GARAGE_OCCURRENCE_ID,

            childId:
              CHILD_ID,

            claimedByDisplayName:
              'Fixture Child',

            claimState:
              claimState,

            claimedAt:
              Date.UTC(
                2030,
                0,
                15,
                12,
                0,
                0,
              ),

            title:
              'Garage shelves',

            description:
              'Organize the garage shelves.',

            valueSek:
              140,

            scheduledLocalDate:
              '2030-01-15',

            timezone:
              'Europe/Stockholm',

            deadlineAt,

            isMine:
              true,

            commitment:
              claimState ===
              'claimed'
                ? commitment
                : null,
          },
        ];

  const result:
    ClaimableChoresViewModel =
    {
      gate: {
        canAccessClaimables:
          true,

        currentUnlockOccurrence:
          null,
      },

      unclaimAllowance: {
        allowance:
          2,

        usedUnclaims:
          0,

        remainingUnclaims:
          2,

        payoutWeek: {
          startLocalDate:
            '2030-01-11',

          endLocalDate:
            '2030-01-18',

          startAt:
            Date.UTC(
              2030,
              0,
              10,
              23,
              0,
              0,
            ),

          endAt:
            Date.UTC(
              2030,
              0,
              17,
              23,
              0,
              0,
            ),
        },
      },

      claimableOccurrences,

      claimedOccurrences,
    };

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-5 pt-16 pb-16"
    >
      <Text className="text-xs font-semibold tracking-widest text-purple-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-2 text-2xl font-bold text-white">
        TASK-12 Maestro Fixture
      </Text>

      <Text className="mt-2 text-sm leading-5 text-slate-400">
        Deterministic Claimable submission
        and pending-review journey.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset TASK-12 fixture"
        onPress={
          reset
        }
        className="items-center px-4 py-3 mt-4 rounded-xl bg-purple-900"
      >
        <Text className="font-semibold text-purple-200">
          Reset TASK-12 fixture
        </Text>
      </Pressable>

      <ClaimableChoresView
        result={
          result
        }
        onClaim={async (
          occurrenceId,
          acceptImmediateLock,
        ) => {
          if (
            claimState !==
            'none'
          ) {
            throw new Error(
              'Fixture Child already owns an active Claim.',
            );
          }

          if (
            occurrenceId !==
            GARAGE_OCCURRENCE_ID
          ) {
            throw new Error(
              'Fixture expects Garage shelves to be claimed first.',
            );
          }

          if (
            acceptImmediateLock
          ) {
            throw new Error(
              'Garage shelves should not require locked acknowledgement.',
            );
          }

          setClaimState(
            'claimed',
          );
        }}
        onUnclaim={async (
          claimId,
        ) => {
          if (
            claimState !==
              'claimed' ||
            claimId !==
              GARAGE_CLAIM_ID
          ) {
            throw new Error(
              'Unexpected TASK-12 unclaim.',
            );
          }

          setClaimState(
            'none',
          );
        }}
        onSubmit={async (
          claimId,
        ) => {
          if (
            claimState !==
              'claimed' ||
            claimId !==
              GARAGE_CLAIM_ID
          ) {
            throw new Error(
              'Only the active Garage shelves Claim can be submitted.',
            );
          }

          setClaimState(
            'submitted',
          );
        }}
      />
    </ScrollView>
  );
}
