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
  ActiveClaimableClaimsView,
  type ActiveClaimableClaimViewModel,
} from '../chores/active-claimable-claims-view';

const CLAIM_ID =
  'maestro-task11-parent-claim' as Id<'choreClaims'>;

const OCCURRENCE_ID =
  'maestro-task11-parent-occurrence' as Id<'choreOccurrences'>;

const CHILD_ID =
  'maestro-task11-parent-child' as Id<'children'>;

const fixtureClaim:
  ActiveClaimableClaimViewModel =
  {
    claimId:
      CLAIM_ID,

    occurrenceId:
      OCCURRENCE_ID,

    childId:
      CHILD_ID,

    claimedByDisplayName:
      'Child A',

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
      'School supplies',

    description:
      'Sort and organize the school supplies.',

    valueSek:
      90,

    scheduledLocalDate:
      '2030-01-15',

    timezone:
      'Europe/Stockholm',

    deadlineAt:
      Date.UTC(
        2030,
        0,
        15,
        18,
        0,
        0,
      ),
  };

export function Task11ParentCancellationMaestroFixtureScreen() {
  const [
    cancelled,
    setCancelled,
  ] =
    useState(
      false,
    );

  function reset() {
    setCancelled(
      false,
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-5 pt-16 pb-16"
    >
      <Text className="text-xs font-semibold tracking-widest text-purple-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-2 text-2xl font-bold text-white">
        TASK-11 Parent Fixture
      </Text>

      <Text className="mt-2 text-sm leading-5 text-slate-400">
        Deterministic Parent cancellation
        journey.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset TASK-11 Parent fixture"
        onPress={
          reset
        }
        className="items-center px-4 py-3 mt-4 rounded-xl bg-purple-900"
      >
        <Text className="font-semibold text-purple-200">
          Reset Parent fixture
        </Text>
      </Pressable>

      {cancelled ? (
        <Text className="mt-5 text-sm font-semibold text-green-400">
          Cancellation recorded
        </Text>
      ) : null}

      <ActiveClaimableClaimsView
        claims={
          cancelled
            ? []
            : [
                fixtureClaim,
              ]
        }
        onCancel={async (
          claimId,
        ) => {
          if (
            claimId !==
            CLAIM_ID
          ) {
            throw new Error(
              'Unexpected fixture Claim.',
            );
          }

          setCancelled(
            true,
          );
        }}
      />
    </ScrollView>
  );
}
