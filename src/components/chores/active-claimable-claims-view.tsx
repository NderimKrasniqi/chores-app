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

type ActiveClaimState =
  | 'claimed'
  | 'submitted'
  | 'redo_required';

export type ActiveClaimableClaimViewModel = {
  claimId:
    Id<'choreClaims'>;

  occurrenceId:
    Id<'choreOccurrences'>;

  childId:
    Id<'children'>;

  claimedByDisplayName:
    string;

  claimState:
    ActiveClaimState;

  claimedAt:
    number;

  title:
    string;

  description?:
    string;

  valueSek:
    number;

  scheduledLocalDate:
    string;

  timezone:
    string;

  deadlineAt:
    number;
};

function formatClaimState(
  state:
    ActiveClaimState,
) {
  switch (state) {
    case 'claimed':
      return 'Claimed';

    case 'submitted':
      return 'Waiting for review';

    case 'redo_required':
      return 'Redo required';
  }
}

function formatDeadline(
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

  return 'Could not cancel this claim. Please try again.';
}

export function ActiveClaimableClaimsView({
  claims,
  onCancel,
}: {
  claims:
    ActiveClaimableClaimViewModel[];

  onCancel: (
    claimId:
      Id<'choreClaims'>,
  ) => Promise<void>;
}) {
  const [
    confirmingClaimId,
    setConfirmingClaimId,
  ] =
    useState<
      Id<'choreClaims'> | null
    >(null);

  const [
    cancellingClaimId,
    setCancellingClaimId,
  ] =
    useState<
      Id<'choreClaims'> | null
    >(null);

  const [
    actionError,
    setActionError,
  ] =
    useState<
      string | null
    >(null);

  async function handleCancel(
    claimId:
      Id<'choreClaims'>,
  ) {
    if (
      cancellingClaimId
    ) {
      return;
    }

    setActionError(
      null,
    );

    setCancellingClaimId(
      claimId,
    );

    try {
      await onCancel(
        claimId,
      );

      setConfirmingClaimId(
        null,
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
      setCancellingClaimId(
        null,
      );
    }
  }

  if (
    claims.length ===
    0
  ) {
    return null;
  }

  return (
    <View className="pt-5 mt-6 border-t border-slate-800">
      <Text className="font-semibold text-white">
        Active claims
      </Text>

      <Text className="mt-1 text-sm leading-5 text-slate-500">
        Extra chores currently owned by
        Children in this household.
      </Text>

      {actionError ? (
        <View className="p-3 mt-3 border rounded-xl border-red-900 bg-red-950">
          <Text className="text-sm leading-5 text-red-300">
            {actionError}
          </Text>
        </View>
      ) : null}

      {claims.map(
        (
          claim,
        ) => {
          const isConfirming =
            confirmingClaimId ===
            claim.claimId;

          const isCancelling =
            cancellingClaimId ===
            claim.claimId;

          const actionsBusy =
            cancellingClaimId !==
            null;

          return (
            <View
              key={
                claim.claimId
              }
              className="p-4 mt-3 rounded-xl bg-slate-800"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-semibold text-white">
                    {
                      claim.title
                    }
                  </Text>

                  {claim.description ? (
                    <Text className="mt-1 text-sm leading-5 text-slate-400">
                      {
                        claim.description
                      }
                    </Text>
                  ) : null}

                  <Text className="mt-2 text-sm text-slate-300">
                    Claimed by{' '}
                    {
                      claim.claimedByDisplayName
                    }
                  </Text>
                </View>

                <Text className="font-bold text-green-400">
                  {
                    claim.valueSek
                  }{' '}
                  kr
                </Text>
              </View>

              <Text className="mt-2 text-xs text-slate-500">
                Status:{' '}
                {formatClaimState(
                  claim.claimState,
                )}
              </Text>

              <Text className="mt-1 text-xs text-slate-500">
                Deadline:{' '}
                {formatDeadline(
                  claim.deadlineAt,
                  claim.timezone,
                )}
              </Text>

              {isConfirming ? (
                <View className="p-3 mt-4 border rounded-xl border-amber-900 bg-slate-900">
                  <Text className="text-sm font-semibold text-white">
                    Cancel this claim?
                  </Text>

                  <Text className="mt-1 text-xs leading-5 text-slate-400">
                    The chore will be
                    cancelled without a
                    penalty and without
                    using the Child&apos;s
                    weekly unclaim.
                  </Text>

                  <View className="flex-row mt-3">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Keep claim ${claim.title}`}
                      disabled={
                        actionsBusy
                      }
                      onPress={() =>
                        setConfirmingClaimId(
                          null,
                        )
                      }
                      className="items-center flex-1 px-3 py-3 mr-2 rounded-xl bg-slate-700"
                    >
                      <Text className="font-semibold text-white">
                        Keep
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Confirm cancel claim ${claim.title}`}
                      disabled={
                        actionsBusy
                      }
                      onPress={() =>
                        void handleCancel(
                          claim.claimId,
                        )
                      }
                      className={
                        actionsBusy
                          ? 'items-center flex-1 px-3 py-3 rounded-xl bg-slate-700'
                          : 'items-center flex-1 px-3 py-3 rounded-xl bg-red-800'
                      }
                    >
                      <Text
                        className={
                          actionsBusy
                            ? 'font-semibold text-slate-500'
                            : 'font-semibold text-white'
                        }
                      >
                        {isCancelling
                          ? 'Cancelling…'
                          : 'Cancel claim'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel claim ${claim.title}`}
                  disabled={
                    actionsBusy
                  }
                  onPress={() => {
                    setActionError(
                      null,
                    );

                    setConfirmingClaimId(
                      claim.claimId,
                    );
                  }}
                  className="items-center px-4 py-3 mt-4 rounded-xl bg-slate-700"
                >
                  <Text
                    className={
                      actionsBusy
                        ? 'font-semibold text-slate-500'
                        : 'font-semibold text-slate-200'
                    }
                  >
                    Cancel claim
                  </Text>
                </Pressable>
              )}
            </View>
          );
        },
      )}
    </View>
  );
}
