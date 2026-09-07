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

export type RedoChoreReviewViewModel = {
  submissionId:
    Id<'choreSubmissions'>;

  occurrenceId:
    Id<'choreOccurrences'>;

  childId:
    Id<'children'>;

  kind:
    'personal' |
    'claimable';

  childDisplayName:
    string;

  title:
    string;

  description?:
    string;

  valueSek:
    number;

  submittedAt:
    number;

  redoDeadlineAt:
    number;

  timezone:
    string;

  isUnlockChore:
    boolean;
};

type ReviewAction =
  | 'approve'
  | 'reject';

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

  return 'Could not review this Redo. Please try again.';
}

export function RedoChoreReviewsView({
  pending,
  onApprove,
  onReject,
}: {
  pending:
    RedoChoreReviewViewModel[];

  onApprove: (
    submission:
      RedoChoreReviewViewModel,
  ) => Promise<{
    amountSek:
      number;
  }>;

  onReject: (
    submission:
      RedoChoreReviewViewModel,
  ) => Promise<unknown>;
}) {
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

  const [
    actionMessage,
    setActionMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    actionError,
    setActionError,
  ] =
    useState<
      string | null
    >(null);

  async function handleApprove(
    submission:
      RedoChoreReviewViewModel,
  ) {
    if (
      reviewingId !==
      null
    ) {
      return;
    }

    setActionMessage(
      null,
    );

    setActionError(
      null,
    );

    setReviewingId(
      submission
        .submissionId,
    );

    setReviewAction(
      'approve',
    );

    try {
      const result =
        await onApprove(
          submission,
        );

      setActionMessage(
        `Approved Redo ${submission.title}. ${submission.childDisplayName} earned ${result.amountSek} kr.`,
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
      setReviewingId(
        null,
      );

      setReviewAction(
        null,
      );
    }
  }

  async function handleReject(
    submission:
      RedoChoreReviewViewModel,
  ) {
    if (
      reviewingId !==
      null
    ) {
      return;
    }

    setActionMessage(
      null,
    );

    setActionError(
      null,
    );

    setReviewingId(
      submission
        .submissionId,
    );

    setReviewAction(
      'reject',
    );

    try {
      await onReject(
        submission,
      );

      setActionMessage(
        `Rejected Redo ${submission.title}. The chore is now failed.`,
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
      setReviewingId(
        null,
      );

      setReviewAction(
        null,
      );
    }
  }

  return (
    <View className="pt-6 mt-6 border-t border-slate-800">
      <Text className="text-lg font-semibold text-white">
        Redo reviews
      </Text>

      <Text className="mt-2 text-sm leading-5 text-slate-500">
        These are second and final
        submissions. Approve to complete
        the chore, or reject to end it as
        failed.
      </Text>

      {actionMessage ? (
        <View className="p-3 mt-4 border rounded-xl border-green-900 bg-green-950">
          <Text className="text-sm leading-5 text-green-300">
            {actionMessage}
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
            No Redos waiting
          </Text>

          <Text className="mt-2 text-sm leading-5 text-slate-500">
            Submitted Redos will appear
            here for their final Parent
            review.
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
                      <Text className="text-xs font-semibold tracking-wider uppercase text-amber-400">
                        {submission.kind ===
                        'personal'
                          ? 'Personal Redo'
                          : 'Claimable Redo'}
                      </Text>

                      <Text className="mt-1 text-xs font-semibold tracking-wider uppercase text-slate-500">
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
                      Redo submitted:{' '}
                      {formatDateTime(
                        submission
                          .submittedAt,
                        submission
                          .timezone,
                      )}
                    </Text>

                    <Text className="text-xs leading-5 text-slate-500">
                      Redo deadline:{' '}
                      {formatDateTime(
                        submission
                          .redoDeadlineAt,
                        submission
                          .timezone,
                      )}
                    </Text>
                  </View>

                  <Pressable
                    testID={`redo-review-approve-${submission.submissionId}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Approve Redo ${submission.title} for ${submission.childDisplayName}`}
                    disabled={
                      actionsBusy
                    }
                    onPress={() =>
                      void handleApprove(
                        submission,
                      )
                    }
                    className={
                      actionsBusy
                        ? 'items-center px-4 py-3 mt-4 rounded-xl bg-slate-800'
                        : 'items-center px-4 py-3 mt-4 bg-white rounded-xl'
                    }
                  >
                    <Text
                      className={
                        actionsBusy
                          ? 'font-semibold text-slate-500'
                          : 'font-semibold text-slate-950'
                      }
                    >
                      {isApproving
                        ? 'Approving Redo…'
                        : 'Approve Redo'}
                    </Text>
                  </Pressable>

                  <Pressable
                    testID={`redo-review-reject-${submission.submissionId}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Reject Redo ${submission.title} for ${submission.childDisplayName}`}
                    disabled={
                      actionsBusy
                    }
                    onPress={() =>
                      void handleReject(
                        submission,
                      )
                    }
                    className={
                      actionsBusy
                        ? 'items-center px-4 py-3 mt-3 rounded-xl bg-slate-800'
                        : 'items-center px-4 py-3 mt-3 rounded-xl bg-red-900'
                    }
                  >
                    <Text
                      className={
                        actionsBusy
                          ? 'font-semibold text-slate-500'
                          : 'font-semibold text-red-100'
                      }
                    >
                      {isRejecting
                        ? 'Rejecting Redo…'
                        : 'Reject Redo'}
                    </Text>
                  </Pressable>

                  <Text className="mt-3 text-xs leading-5 text-slate-500">
                    A rejected Redo is
                    final. There is no
                    second correction
                    opportunity.
                  </Text>
                </View>
              );
            },
          )}
        </View>
      )}
    </View>
  );
}
