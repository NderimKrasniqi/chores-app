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
  'task13-parent-submission' as Id<'choreSubmissions'>;

const CLAIM_ID =
  'task13-parent-claim' as Id<'choreClaims'>;

const OCCURRENCE_ID =
  'task13-parent-occurrence' as Id<'choreOccurrences'>;

const CHILD_ID =
  'task13-parent-child' as Id<'children'>;

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
      '2030-01-16',

    submittedAt:
      Date.UTC(
        2030,
        0,
        16,
        16,
        30,
        0,
      ),

    deadlineAt:
      Date.UTC(
        2030,
        0,
        16,
        17,
        0,
        0,
      ),

    timezone:
      'Europe/Stockholm',
  };

export function Task13ParentRejectionMaestroFixtureScreen() {
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
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerClassName="px-5 pt-16 pb-16"
    >
      <Text className="text-xs font-semibold tracking-widest text-amber-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-2 text-2xl font-bold text-white">
        TASK-13 Parent Rejection Fixture
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset TASK-13 parent rejection fixture"
        onPress={
          reset
        }
        className="items-center px-4 py-3 mt-4 rounded-xl bg-amber-900"
      >
        <Text className="font-semibold text-amber-200">
          Reset rejection fixture
        </Text>
      </Pressable>

      <ClaimableChoreReviewsView
        pending={
          pending
        }
        onApprove={async () => {
          throw new Error(
            'Approval is not used by this TASK-13 fixture.',
          );
        }}
        onReject={async (
          submissionId,
        ) => {
          if (
            submissionId !==
            SUBMISSION_ID
          ) {
            throw new Error(
              'Unexpected TASK-13 submission.',
            );
          }

          setPending(
            [],
          );
        }}
      />
    </ScrollView>
  );
}
