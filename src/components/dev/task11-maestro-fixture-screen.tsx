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
  'maestro-task11-child' as Id<'children'>;

const DOG_WALK_OCCURRENCE_ID =
  'maestro-task11-dog-walk-occurrence' as Id<'choreOccurrences'>;

const DOG_WALK_CLAIM_ID =
  'maestro-task11-dog-walk-claim' as Id<'choreClaims'>;

const LATE_CLEANUP_OCCURRENCE_ID =
  'maestro-task11-late-cleanup-occurrence' as Id<'choreOccurrences'>;

const LATE_CLEANUP_CLAIM_ID =
  'maestro-task11-late-cleanup-claim' as Id<'choreClaims'>;

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

const ordinaryCommitment = {
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

const lockedCommitment = {
  lockAt,

  isTimeLocked:
    true,

  hasUnclaimAllowance:
    true,

  remainingUnclaims:
    2,

  canUnclaim:
    false,

  isImmediatelyLocked:
    true,

  lockReason:
    'time_window',
} as const;

type ActiveFixtureClaim =
  | 'dog_walk'
  | 'late_cleanup'
  | null;

export function Task11MaestroFixtureScreen() {
  const [
    activeClaim,
    setActiveClaim,
  ] =
    useState<ActiveFixtureClaim>(
      null,
    );

  const [
    successfulUnclaims,
    setSuccessfulUnclaims,
  ] =
    useState(
      0,
    );

  function reset() {
    setActiveClaim(
      null,
    );

    setSuccessfulUnclaims(
      0,
    );
  }

  const remainingUnclaims =
    Math.max(
      2 -
        successfulUnclaims,
      0,
    );

  const claimableOccurrences:
    ClaimableChoresViewModel['claimableOccurrences'] =
    [];

  if (
    activeClaim !==
    'dog_walk'
  ) {
    claimableOccurrences.push({
      occurrenceId:
        DOG_WALK_OCCURRENCE_ID,

      title:
        'Dog walk',

      description:
        'Take the dog for an afternoon walk.',

      valueSek:
        70,

      timezone:
        'Europe/Stockholm',

      deadlineAt,

      commitment: {
        ...ordinaryCommitment,

        remainingUnclaims,
      },
    });
  }

  if (
    activeClaim !==
    'late_cleanup'
  ) {
    claimableOccurrences.push({
      occurrenceId:
        LATE_CLEANUP_OCCURRENCE_ID,

      title:
        'Late cleanup',

      description:
        'Help clean up before the deadline.',

      valueSek:
        120,

      timezone:
        'Europe/Stockholm',

      deadlineAt,

      commitment: {
        ...lockedCommitment,

        remainingUnclaims,
      },
    });
  }

  const claimedOccurrences:
    ClaimableChoresViewModel['claimedOccurrences'] =
    [];

  if (
    activeClaim ===
    'dog_walk'
  ) {
    claimedOccurrences.push({
      claimId:
        DOG_WALK_CLAIM_ID,

      occurrenceId:
        DOG_WALK_OCCURRENCE_ID,

      childId:
        CHILD_ID,

      claimedByDisplayName:
        'Fixture Child',

      claimState:
        'claimed',

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
        'Dog walk',

      description:
        'Take the dog for an afternoon walk.',

      valueSek:
        70,

      scheduledLocalDate:
        '2030-01-15',

      timezone:
        'Europe/Stockholm',

      deadlineAt,

      isMine:
        true,

      commitment: {
        ...ordinaryCommitment,

        remainingUnclaims,
      },
    });
  }

  if (
    activeClaim ===
    'late_cleanup'
  ) {
    claimedOccurrences.push({
      claimId:
        LATE_CLEANUP_CLAIM_ID,

      occurrenceId:
        LATE_CLEANUP_OCCURRENCE_ID,

      childId:
        CHILD_ID,

      claimedByDisplayName:
        'Fixture Child',

      claimState:
        'claimed',

      claimedAt:
        Date.UTC(
          2030,
          0,
          15,
          16,
          30,
          0,
        ),

      title:
        'Late cleanup',

      description:
        'Help clean up before the deadline.',

      valueSek:
        120,

      scheduledLocalDate:
        '2030-01-15',

      timezone:
        'Europe/Stockholm',

      deadlineAt,

      isMine:
        true,

      commitment: {
        ...lockedCommitment,

        remainingUnclaims,
      },
    });
  }

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
          successfulUnclaims,

        remainingUnclaims,

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
        TASK-11 Maestro Fixture
      </Text>

      <Text className="mt-2 text-sm leading-5 text-slate-400">
        Deterministic unclaim and
        commitment-lock journeys.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset TASK-11 fixture"
        onPress={
          reset
        }
        className="items-center px-4 py-3 mt-4 rounded-xl bg-purple-900"
      >
        <Text className="font-semibold text-purple-200">
          Reset TASK-11 fixture
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
            activeClaim !==
            null
          ) {
            throw new Error(
              'Fixture Child already has an active Claim.',
            );
          }

          if (
            occurrenceId ===
            DOG_WALK_OCCURRENCE_ID
          ) {
            if (
              acceptImmediateLock
            ) {
              throw new Error(
                'Dog walk should not require locked acknowledgement.',
              );
            }

            setActiveClaim(
              'dog_walk',
            );

            return;
          }

          if (
            occurrenceId ===
            LATE_CLEANUP_OCCURRENCE_ID
          ) {
            if (
              !acceptImmediateLock
            ) {
              throw new Error(
                'Late cleanup requires locked acknowledgement.',
              );
            }

            setActiveClaim(
              'late_cleanup',
            );

            return;
          }

          throw new Error(
            'Unknown TASK-11 fixture occurrence.',
          );
        }}
        onUnclaim={async (
          claimId,
        ) => {
          if (
            activeClaim !==
              'dog_walk' ||
            claimId !==
              DOG_WALK_CLAIM_ID
          ) {
            throw new Error(
              'Only Dog walk can be unclaimed in this fixture.',
            );
          }

          setActiveClaim(
            null,
          );

          setSuccessfulUnclaims(
            (
              current,
            ) =>
              current +
              1,
          );
        }}
      />
    </ScrollView>
  );
}
