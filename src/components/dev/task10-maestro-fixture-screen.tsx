import {
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import type {
  Id,
} from '../../../convex/_generated/dataModel';
import {
  ClaimableChoresView,
  type ClaimableChoresViewModel,
} from '../chores/claimable-chores-view';

const PARTY_OCCURRENCE_ID =
  'maestro-party-occurrence' as Id<'choreOccurrences'>;

const LAUNDRY_OCCURRENCE_ID =
  'maestro-laundry-occurrence' as Id<'choreOccurrences'>;

const PARTY_CLAIM_ID =
  'maestro-party-claim' as Id<'choreClaims'>;

const CHILD_A_ID =
  'maestro-child-a' as Id<'children'>;

const deadlineAt =
  Date.UTC(
    2030,
    0,
    15,
    18,
    0,
    0,
  );

type Viewer =
  | 'childA'
  | 'childB';

export function Task10MaestroFixtureScreen() {
  const [
    viewer,
    setViewer,
  ] =
    useState<Viewer>(
      'childA',
    );

  const [
    partyClaimed,
    setPartyClaimed,
  ] =
    useState(
      false,
    );

  function reset() {
    setViewer(
      'childA',
    );

    setPartyClaimed(
      false,
    );
  }

  const claimableOccurrences:
    ClaimableChoresViewModel['claimableOccurrences'] =
    [
      ...(
        partyClaimed
          ? []
          : [
              {
                occurrenceId:
                  PARTY_OCCURRENCE_ID,

                title:
                  'Party',

                description:
                  'Help prepare for the party.',

                valueSek:
                  200,

                timezone:
                  'Europe/Stockholm',

                deadlineAt,
              },
            ]
      ),

      {
        occurrenceId:
          LAUNDRY_OCCURRENCE_ID,

        title:
          'Laundry',

        description:
          'Fold the clean laundry.',

        valueSek:
          80,

        timezone:
          'Europe/Stockholm',

        deadlineAt,
      },
    ];

  const claimedOccurrences:
    ClaimableChoresViewModel['claimedOccurrences'] =
    partyClaimed
      ? [
          {
            claimId:
              PARTY_CLAIM_ID,

            occurrenceId:
              PARTY_OCCURRENCE_ID,

            childId:
              CHILD_A_ID,

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
              'Party',

            description:
              'Help prepare for the party.',

            valueSek:
              200,

            scheduledLocalDate:
              '2030-01-15',

            timezone:
              'Europe/Stockholm',

            deadlineAt,

            isMine:
              viewer ===
              'childA',
          },
        ]
      : [];

  const result:
    ClaimableChoresViewModel =
    {
      gate: {
        canAccessClaimables:
          true,

        currentUnlockOccurrence:
          null,
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
        TASK-10 Maestro Fixture
      </Text>

      <Text className="mt-2 text-sm text-slate-400">
        Viewing as{' '}
        {viewer ===
        'childA'
          ? 'Child A'
          : 'Child B'}
      </Text>

      <View className="flex-row mt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View as Child A"
          onPress={() =>
            setViewer(
              'childA',
            )
          }
          className="px-3 py-2 mr-2 rounded-lg bg-slate-800"
        >
          <Text className="font-semibold text-white">
            Child A
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View as Child B"
          onPress={() =>
            setViewer(
              'childB',
            )
          }
          className="px-3 py-2 mr-2 rounded-lg bg-slate-800"
        >
          <Text className="font-semibold text-white">
            Child B
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset TASK-10 fixture"
          onPress={
            reset
          }
          className="px-3 py-2 rounded-lg bg-purple-900"
        >
          <Text className="font-semibold text-purple-200">
            Reset
          </Text>
        </Pressable>
      </View>

      <ClaimableChoresView
        result={
          result
        }
        onClaim={async (
          occurrenceId,
        ) => {
          if (
            viewer !==
            'childA'
          ) {
            throw new Error(
              'Fixture expects Child A to claim Party.',
            );
          }

          if (
            occurrenceId !==
            PARTY_OCCURRENCE_ID
          ) {
            throw new Error(
              'Fixture expects Party to be claimed first.',
            );
          }

          setPartyClaimed(
            true,
          );
        }}
      />
    </ScrollView>
  );
}
