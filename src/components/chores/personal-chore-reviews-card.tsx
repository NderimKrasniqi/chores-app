import { useServerConfirmedMutation } from '@/hooks/use-server-confirmed-mutation';
import {
  useQuery,
} from 'convex/react';
import {
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';
import type {
  Id,
} from '../../../convex/_generated/dataModel';
import { RedoDeadlineRejectControls } from './redo-deadline-reject-controls';
import { SubmissionEvidenceViewer } from '../evidence/submission-evidence-viewer';

type PersonalChoreReviewsCardProps = {
  householdId:
    Id<'households'>;
};

type ReviewAction =
  | 'approve'
  | 'reject';

function formatDateTime(
  timestamp: number,
) {
  return new Intl.DateTimeFormat(
    'en-SE',
    {
      dateStyle:
        'medium',

      timeStyle:
        'short',
    },
  ).format(
    new Date(
      timestamp,
    ),
  );
}

export function PersonalChoreReviewsCard({
  householdId,
}: PersonalChoreReviewsCardProps) {
  const pending =
    useQuery(
      api
        .personalChoreReviews
        .listPending,
      {
        householdId,
      },
    );

  const approve =
    useServerConfirmedMutation(
      api
        .personalChoreReviews
        .approve,
    );

  const reject =
    useServerConfirmedMutation(
      api
        .personalChoreReviews
        .reject,
    );

  const [
    reviewingId,
    setReviewingId,
  ] =
    useState<
      Id<'choreSubmissions'> |
        null
    >(null);

  const [
    reviewAction,
    setReviewAction,
  ] =
    useState<
      ReviewAction | null
    >(null);

  async function handleApprove(
    submissionId:
      Id<'choreSubmissions'>,
    title:
      string,
    childDisplayName:
      string,
  ) {
    if (
      reviewingId !==
      null
    ) {
      return;
    }

    setReviewingId(
      submissionId,
    );

    setReviewAction(
      'approve',
    );

    try {
      const result =
        await approve({
          submissionId,
        });

      Alert.alert(
        'Approved',
        `${childDisplayName} earned ${result.amountSek} kr for ${title}.`,
      );
    } catch (
      error
    ) {
      Alert.alert(
        'Could not approve',
        error instanceof
          Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setReviewingId(
        null,
      );

      setReviewAction(
        null,
      );
    }
  }

  async function handleReject(
    submissionId:
      Id<'choreSubmissions'>,
    title:
      string,
    childDisplayName:
      string,
    redoDeadlineLocalDate:
      string,
    redoDeadlineLocalTime:
      string,
  ) {
    if (
      reviewingId !==
      null
    ) {
      return;
    }

    setReviewingId(
      submissionId,
    );

    setReviewAction(
      'reject',
    );

    try {
      await reject({
        submissionId,

        redoDeadlineLocalDate,

        redoDeadlineLocalTime,
      });

      Alert.alert(
        'Redo required',
        `${childDisplayName} can redo ${title} by ${redoDeadlineLocalDate} ${redoDeadlineLocalTime}.`,
      );
    } catch (
      error
    ) {
      Alert.alert(
        'Could not reject',
        error instanceof
          Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setReviewingId(
        null,
      );

      setReviewAction(
        null,
      );
    }
  }

  if (
    pending ===
    undefined
  ) {
    return (
      <View className="p-5 rounded-2xl bg-slate-900">
        <Text className="text-lg font-semibold text-white">
          Personal chore reviews
        </Text>

        <Text className="mt-2 text-sm text-slate-500">
          Loading submissions…
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-lg font-semibold text-white">
        Personal chore reviews
      </Text>

      <Text className="mt-2 text-sm leading-5 text-slate-500">
        Approve completed work or reject
        the first submission with one Redo
        deadline.
      </Text>

      {pending.length ===
      0 ? (
        <View className="p-5 mt-4 rounded-2xl bg-slate-950">
          <Text className="font-semibold text-white">
            Nothing waiting
          </Text>

          <Text className="mt-2 text-sm leading-5 text-slate-500">
            Submitted Personal Chores will
            appear here for Parent review.
          </Text>
        </View>
      ) : (
        <View className="mt-4">
          {pending.map(
            (
              submission,
            ) => {
              const isCurrent =
                reviewingId ===
                submission
                  .submissionId;

              const isApproving =
                isCurrent &&
                reviewAction ===
                  'approve';

              const isRejecting =
                isCurrent &&
                reviewAction ===
                  'reject';

              const actionsBusy =
                reviewingId !==
                null;

              return (
                <View
                  key={
                    submission
                      .submissionId
                  }
                  className="p-4 mb-3 border rounded-2xl border-slate-800 bg-slate-950"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-xs font-semibold tracking-wider uppercase text-slate-500">
                        {
                          submission
                            .childDisplayName
                        }
                      </Text>

                      <Text className="mt-1 text-lg font-semibold text-white">
                        {
                          submission
                            .title
                        }
                      </Text>

                      {submission.description ? (
                        <Text className="mt-2 text-sm leading-5 text-slate-400">
                          {
                            submission
                              .description
                          }
                        </Text>
                      ) : null}
                    </View>

                    <Text className="text-lg font-bold text-green-400">
                      {
                        submission
                          .valueSek
                      }{' '}
                      kr
                    </Text>
                  </View>

                  {submission.isUnlockChore ? (
                    <View className="self-start px-2 py-1 mt-3 rounded-lg bg-amber-950">
                      <Text className="text-xs font-semibold text-amber-400">
                        Unlock chore
                      </Text>
                    </View>
                  ) : null}

                  <View className="pt-3 mt-4 border-t border-slate-800">
                    <Text className="text-xs leading-5 text-slate-500">
                      Submitted:{' '}
                      {formatDateTime(
                        submission
                          .submittedAt,
                      )}
                    </Text>

                    <Text className="text-xs leading-5 text-slate-500">
                      Original deadline:{' '}
                      {formatDateTime(
                        submission
                          .deadlineAt,
                      )}
                    </Text>
                  </View>

                  {submission.hasEvidence ? (
                    <SubmissionEvidenceViewer
                      submissionId={
                        submission
                          .submissionId
                      }
                    />
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Approve personal chore ${submission.title} for ${submission.childDisplayName}`}
                    className={
                      actionsBusy
                        ? 'px-4 py-3 mt-4 rounded-xl bg-slate-700'
                        : 'px-4 py-3 mt-4 bg-white rounded-xl'
                    }
                    disabled={
                      actionsBusy
                    }
                    onPress={() =>
                      void handleApprove(
                        submission
                          .submissionId,
                        submission.title,
                        submission
                          .childDisplayName,
                      )
                    }
                  >
                    <Text
                      className={
                        actionsBusy
                          ? 'font-semibold text-center text-slate-400'
                          : 'font-semibold text-center text-slate-950'
                      }
                    >
                      {isApproving
                        ? 'Approving…'
                        : 'Approve'}
                    </Text>
                  </Pressable>

                  <RedoDeadlineRejectControls
                    disabled={
                      actionsBusy
                    }
                    rejecting={
                      isRejecting
                    }
                    title={
                      submission.title
                    }
                    childDisplayName={
                      submission
                        .childDisplayName
                    }
                    onReject={async (
                      redoDeadlineLocalDate,
                      redoDeadlineLocalTime,
                    ) => {
                      await handleReject(
                        submission
                          .submissionId,
                        submission.title,
                        submission
                          .childDisplayName,
                        redoDeadlineLocalDate,
                        redoDeadlineLocalTime,
                      );
                    }}
                  />
                </View>
              );
            },
          )}
        </View>
      )}
    </View>
  );
}
