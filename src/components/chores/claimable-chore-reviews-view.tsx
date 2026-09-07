import {
  useState,
} from 'react';
import {
  Pressable,
  Text,
  View,
} from 'react-native';

import type {
  Id,
} from '../../../convex/_generated/dataModel';

export type ClaimableChoreReviewViewModel = {
  submissionId:
    Id<'choreSubmissions'>;

  claimId:
    Id<'choreClaims'>;

  occurrenceId:
    Id<'choreOccurrences'>;

  childId:
    Id<'children'>;

  childDisplayName:
    string;

  title:
    string;

  description?:
    string;

  valueSek:
    number;

  scheduledLocalDate:
    string;

  submittedAt:
    number;

  deadlineAt:
    number;

  timezone:
    string;
};

function formatDateTime(
  timestamp: number,
  timezone: string,
) {
  try {
    return new Intl.DateTimeFormat(
      'en-SE',
      {
        timeZone:
          timezone,

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
  } catch {
    return new Date(
      timestamp,
    ).toLocaleString();
  }
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof
      Error &&
    error.message
  ) {
    return error.message;
  }

  return 'Could not approve this chore. Please try again.';
}

export function ClaimableChoreReviewsView({
  pending,
  onApprove,
}: {
  pending:
    ClaimableChoreReviewViewModel[];

  onApprove: (
    submissionId:
      Id<'choreSubmissions'>,
  ) => Promise<{
    amountSek:
      number;
  }>;
}) {
  const [
    approvingId,
    setApprovingId,
  ] =
    useState<
      Id<'choreSubmissions'> |
        null
    >(null);

  const [
    actionError,
    setActionError,
  ] =
    useState<
      string | null
    >(null);

  const [
    approvalMessage,
    setApprovalMessage,
  ] =
    useState<
      string | null
    >(null);

  async function handleApprove(
    submission:
      ClaimableChoreReviewViewModel,
  ) {
    if (
      approvingId !==
      null
    ) {
      return;
    }

    setActionError(
      null,
    );

    setApprovalMessage(
      null,
    );

    setApprovingId(
      submission.submissionId,
    );

    try {
      const result =
        await onApprove(
          submission.submissionId,
        );

      setApprovalMessage(
        `Approved ${submission.title}. ${submission.childDisplayName} earned ${result.amountSek} kr.`,
      );
    } catch (
      error
    ) {
      setActionError(
        getErrorMessage(
          error,
        ),
      );
    } finally {
      setApprovingId(
        null,
      );
    }
  }

  return (
    <View className="pt-6 mt-6 border-t border-slate-800">
      <Text className="text-lg font-semibold text-white">
        Claimable chore reviews
      </Text>

      <Text className="mt-2 text-sm leading-5 text-slate-500">
        Approve completed extra chores.
        The Child keeps the active Claim
        while review is pending.
      </Text>

      {approvalMessage ? (
        <View className="p-3 mt-4 border rounded-xl border-green-900 bg-green-950">
          <Text className="text-sm leading-5 text-green-300">
            {approvalMessage}
          </Text>
        </View>
      ) : null}

      {actionError ? (
        <View className="p-3 mt-4 border rounded-xl border-red-900 bg-red-950">
          <Text className="text-sm leading-5 text-red-300">
            {actionError}
          </Text>
        </View>
      ) : null}

      {pending.length ===
      0 ? (
        <View className="p-5 mt-4 rounded-2xl bg-slate-950">
          <Text className="font-semibold text-white">
            Nothing waiting
          </Text>

          <Text className="mt-2 text-sm leading-5 text-slate-500">
            Submitted Claimable Chores will
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
                submission
                  .submissionId;

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

                  <View className="pt-3 mt-4 border-t border-slate-800">
                    <Text className="text-xs leading-5 text-slate-500">
                      Submitted:{' '}
                      {formatDateTime(
                        submission
                          .submittedAt,
                        submission
                          .timezone,
                      )}
                    </Text>

                    <Text className="text-xs leading-5 text-slate-500">
                      Original deadline:{' '}
                      {formatDateTime(
                        submission
                          .deadlineAt,
                        submission
                          .timezone,
                      )}
                    </Text>
                  </View>

                  <Text className="mt-3 text-xs leading-5 text-slate-500">
                    Approval creates the{' '}
                    {
                      submission
                        .valueSek
                    }{' '}
                    kr earning and releases
                    this Child&apos;s active
                    Claim slot.
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Approve claimable chore ${submission.title} for ${submission.childDisplayName}`}
                    disabled={
                      approvingId !==
                      null
                    }
                    onPress={() =>
                      void handleApprove(
                        submission,
                      )
                    }
                    className={
                      approvingId !==
                      null
                        ? 'px-4 py-3 mt-4 rounded-xl bg-slate-700'
                        : 'px-4 py-3 mt-4 bg-white rounded-xl'
                    }
                  >
                    <Text
                      className={
                        approvingId !==
                        null
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
