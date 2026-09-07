import {
  useState,
} from 'react';
import {
  ScrollView,
  Text,
} from 'react-native';

import type {
  Id,
} from '../../../convex/_generated/dataModel';
import {
  RedoChoreReviewsView,
  type RedoChoreReviewViewModel,
} from '../chores/redo-chore-reviews-view';

const PERSONAL_SUBMISSION_ID =
  'task13-personal-redo-review' as Id<'choreSubmissions'>;

const CLAIMABLE_SUBMISSION_ID =
  'task13-claimable-redo-review' as Id<'choreSubmissions'>;

const CHILD_ID =
  'task13-redo-child' as Id<'children'>;

const REDO_DEADLINE =
  Date.UTC(
    2030,
    0,
    17,
    17,
    0,
    0,
  );

const initialPending:
  RedoChoreReviewViewModel[] =
  [
    {
      submissionId:
        PERSONAL_SUBMISSION_ID,

      occurrenceId:
        'task13-personal-redo-occurrence' as Id<'choreOccurrences'>,

      childId:
        CHILD_ID,

      kind:
        'personal',

      childDisplayName:
        'Fixture Child',

      title:
        'Bedroom reset',

      description:
        'Put everything back in place.',

      valueSek:
        90,

      submittedAt:
        Date.UTC(
          2030,
          0,
          17,
          16,
          0,
          0,
        ),

      redoDeadlineAt:
        REDO_DEADLINE,

      timezone:
        'Europe/Stockholm',

      isUnlockChore:
        false,
    },

    {
      submissionId:
        CLAIMABLE_SUBMISSION_ID,

      occurrenceId:
        'task13-claimable-redo-occurrence' as Id<'choreOccurrences'>,

      childId:
        CHILD_ID,

      kind:
        'claimable',

      childDisplayName:
        'Fixture Child',

      title:
        'Garage shelves',

      description:
        'Organize the garage shelves.',

      valueSek:
        140,

      submittedAt:
        Date.UTC(
          2030,
          0,
          17,
          16,
          15,
          0,
        ),

      redoDeadlineAt:
        REDO_DEADLINE,

      timezone:
        'Europe/Stockholm',

      isUnlockChore:
        false,
    },
  ];

export function Task13ParentRedoReviewMaestroFixtureScreen() {
  const [
    pending,
    setPending,
  ] =
    useState<
      RedoChoreReviewViewModel[]
    >(
      initialPending,
    );

  function remove(
    submissionId:
      Id<'choreSubmissions'>,
  ) {
    setPending(
      (
        current,
      ) =>
        current.filter(
          (
            submission,
          ) =>
            submission
              .submissionId !==
            submissionId,
        ),
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-5 pt-16 pb-16"
    >
      <Text className="text-xs font-semibold tracking-widest text-amber-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-2 text-2xl font-bold text-white">
        TASK-13 Parent Redo Review Fixture
      </Text>

      <RedoChoreReviewsView
        pending={
          pending
        }
        onApprove={async (
          submission,
        ) => {
          remove(
            submission
              .submissionId,
          );

          return {
            amountSek:
              submission
                .valueSek,
          };
        }}
        onReject={async (
          submission,
        ) => {
          remove(
            submission
              .submissionId,
          );
        }}
      />
    </ScrollView>
  );
}
