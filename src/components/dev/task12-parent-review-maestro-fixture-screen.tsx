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
  ClaimableChoreReviewsView,
  type ClaimableChoreReviewViewModel,
} from '../chores/claimable-chore-reviews-view';

const SUBMISSION_ID =
  'task12-parent-submission' as Id<'choreSubmissions'>;

const CLAIM_ID =
  'task12-parent-claim' as Id<'choreClaims'>;

const OCCURRENCE_ID =
  'task12-parent-occurrence' as Id<'choreOccurrences'>;

const CHILD_ID =
  'task12-parent-child' as Id<'children'>;

const fixtureReview:
  ClaimableChoreReviewViewModel =
  {
    submissionId:
      SUBMISSION_ID,

    claimId:
      CLAIM_ID,

    occurrenceId:
      OCCURRENCE_ID,

    childId:
      CHILD_ID,

    childDisplayName:
      'Fixture Child',

    title:
      'Garage shelves',

    description:
      'Organize the garage shelves.',

    valueSek:
      140,

    scheduledLocalDate:
      '2030-01-15',

    submittedAt:
      Date.UTC(
        2030,
        0,
        15,
        16,
        30,
        0,
      ),

    deadlineAt:
      Date.UTC(
        2030,
        0,
        15,
        18,
        0,
        0,
      ),

    timezone:
      'Europe/Stockholm',
  };

export function Task12ParentReviewMaestroFixtureScreen() {
  const [
    pending,
    setPending,
  ] =
    useState<
      ClaimableChoreReviewViewModel[]
    >([
      fixtureReview,
    ]);

  function reset() {
    setPending([
      fixtureReview,
    ]);
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
        TASK-12 Parent Review Fixture
      </Text>

      <Text className="mt-2 text-sm leading-5 text-slate-400">
        Deterministic Claimable approval
        and earning presentation.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset TASK-12 parent review fixture"
        onPress={
          reset
        }
        className="items-center px-4 py-3 mt-4 rounded-xl bg-purple-900"
      >
        <Text className="font-semibold text-purple-200">
          Reset parent review fixture
        </Text>
      </Pressable>

      <ClaimableChoreReviewsView
        pending={
          pending
        }
        onApprove={async (
          submissionId,
        ) => {
          if (
            submissionId !==
            SUBMISSION_ID
          ) {
            throw new Error(
              'Unexpected TASK-12 submission.',
            );
          }

          setPending(
            [],
          );

          return {
            amountSek:
              140,
          };
        }}
      />
    </ScrollView>
  );
}
