import {
  useMutation,
  useQuery,
} from 'convex/react';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type PersonalChoreReviewsCardProps = {
  householdId:
    Id<'households'>;
};

function formatDateTime(
  timestamp: number,
) {
  return new Intl.DateTimeFormat(
    'en-SE',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(
    new Date(timestamp),
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
    useMutation(
      api
        .personalChoreReviews
        .approve,
    );

  const [
    approvingId,
    setApprovingId,
  ] = useState<
    Id<'choreSubmissions'> |
      undefined
  >(undefined);

  async function handleApprove(
    submissionId:
      Id<'choreSubmissions'>,
    title: string,
    childDisplayName:
      string,
  ) {
    setApprovingId(
      submissionId,
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
        error instanceof Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setApprovingId(
        undefined,
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
        Approve submitted Personal Chores
        after checking the completed work.
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
              const isApproving =
                approvingId ===
                submission.submissionId;

              return (
                <View
                  key={
                    submission.submissionId
                  }
                  className="p-4 mb-3 border rounded-2xl border-slate-800 bg-slate-950"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-xs font-semibold tracking-wider uppercase text-slate-500">
                        {
                          submission.childDisplayName
                        }
                      </Text>

                      <Text className="mt-1 text-lg font-semibold text-white">
                        {
                          submission.title
                        }
                      </Text>

                      {submission.description ? (
                        <Text className="mt-2 text-sm leading-5 text-slate-400">
                          {
                            submission.description
                          }
                        </Text>
                      ) : null}
                    </View>

                    <Text className="text-lg font-bold text-green-400">
                      {
                        submission.valueSek
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
                        submission.submittedAt,
                      )}
                    </Text>

                    <Text className="text-xs leading-5 text-slate-500">
                      Original deadline:{' '}
                      {formatDateTime(
                        submission.deadlineAt,
                      )}
                    </Text>
                  </View>

                  <Pressable
                    className={
                      isApproving
                        ? 'px-4 py-3 mt-4 rounded-xl bg-slate-700'
                        : 'px-4 py-3 mt-4 bg-white rounded-xl'
                    }
                    disabled={
                      isApproving
                    }
                    onPress={() =>
                      handleApprove(
                        submission.submissionId,
                        submission.title,
                        submission.childDisplayName,
                      )
                    }
                  >
                    <Text
                      className={
                        isApproving
                          ? 'font-semibold text-center text-slate-400'
                          : 'font-semibold text-center text-slate-950'
                      }
                    >
                      {isApproving
                        ? 'Approving…'
                        : 'Approve'}
                    </Text>
                  </Pressable>
                </View>
              );
            },
          )}
        </View>
      )}
    </View>
  );
}
