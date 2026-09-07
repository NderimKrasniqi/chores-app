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

type UnlockState =
  | 'scheduled'
  | 'available'
  | 'submitted'
  | 'redo_required'
  | 'approved'
  | 'missed'
  | 'failed'
  | 'cancelled'
  | 'expired_unclaimed';

type ClaimState =
  | 'claimed'
  | 'submitted'
  | 'redo_required'
  | 'approved'
  | 'unclaimed'
  | 'cancelled'
  | 'failed';

export type ClaimableChoresViewModel = {
  gate: {
    canAccessClaimables:
      boolean;

    currentUnlockOccurrence:
      | {
          occurrenceId:
            Id<'choreOccurrences'>;

          state:
            UnlockState;

          scheduledLocalDate:
            string;

          availabilityStartsAt:
            number;

          deadlineAt:
            number;
        }
      | null;
  };

  claimableOccurrences: Array<{
    occurrenceId:
      Id<'choreOccurrences'>;

    title:
      string;

    description?:
      string;

    valueSek:
      number;

    timezone:
      string;

    deadlineAt:
      number;
  }>;

  claimedOccurrences: Array<{
    claimId:
      Id<'choreClaims'>;

    occurrenceId:
      Id<'choreOccurrences'>;

    childId:
      Id<'children'>;

    claimedByDisplayName:
      string;

    claimState:
      ClaimState;

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

    isMine:
      boolean;
  }>;
};

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

function formatUnlockState(
  state: UnlockState,
) {
  switch (state) {
    case 'scheduled':
      return 'Upcoming';

    case 'available':
      return 'Waiting for completion';

    case 'submitted':
      return 'Waiting for parent approval';

    case 'redo_required':
      return 'Redo required';

    case 'approved':
      return 'Approved';

    case 'missed':
      return 'Missed';

    case 'failed':
      return 'Failed';

    case 'cancelled':
      return 'Cancelled';

    case 'expired_unclaimed':
      return 'Expired';
  }
}

function formatClaimState(
  state: ClaimState,
) {
  switch (state) {
    case 'claimed':
      return 'Claimed';

    case 'submitted':
      return 'Waiting for parent approval';

    case 'redo_required':
      return 'Redo required';

    case 'approved':
      return 'Approved';

    case 'unclaimed':
      return 'Unclaimed';

    case 'cancelled':
      return 'Cancelled';

    case 'failed':
      return 'Failed';
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

  return 'Could not claim this chore. Please try again.';
}

function ClaimedChoresSection({
  claimedOccurrences,
}: {
  claimedOccurrences:
    ClaimableChoresViewModel['claimedOccurrences'];
}) {
  if (
    claimedOccurrences.length ===
    0
  ) {
    return null;
  }

  return (
    <View className="mt-5">
      <Text className="text-sm font-semibold text-slate-300">
        Claimed
      </Text>

      {claimedOccurrences.map(
        (
          occurrence,
        ) => (
          <View
            key={
              occurrence.claimId
            }
            className="p-4 mt-3 border rounded-xl border-slate-800 bg-slate-950"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-white">
                  {
                    occurrence.title
                  }
                </Text>

                {occurrence.description ? (
                  <Text className="mt-1 text-sm leading-5 text-slate-400">
                    {
                      occurrence.description
                    }
                  </Text>
                ) : null}
              </View>

              <Text className="text-base font-bold text-green-400">
                {
                  occurrence.valueSek
                }{' '}
                kr
              </Text>
            </View>

            <Text className="mt-3 text-sm font-medium text-slate-300">
              {occurrence.isMine
                ? 'You claimed this'
                : `Claimed by ${occurrence.claimedByDisplayName}`}
            </Text>

            <Text className="mt-1 text-xs text-slate-500">
              Status:{' '}
              {formatClaimState(
                occurrence.claimState,
              )}
            </Text>

            <Text className="mt-1 text-xs leading-5 text-slate-500">
              Deadline:{' '}
              {formatDeadline(
                occurrence.deadlineAt,
                occurrence.timezone,
              )}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

export function ClaimableChoresView({
  result,
  onClaim,
}: {
  result:
    ClaimableChoresViewModel;

  onClaim: (
    occurrenceId:
      Id<'choreOccurrences'>,
  ) => Promise<void>;
}) {
  const {
    gate,
    claimableOccurrences,
    claimedOccurrences,
  } = result;

  const [
    claimingOccurrenceId,
    setClaimingOccurrenceId,
  ] =
    useState<
      Id<'choreOccurrences'> | null
    >(null);

  const [
    claimError,
    setClaimError,
  ] =
    useState<
      string | null
    >(null);

  const hasMyActiveClaim =
    claimedOccurrences.some(
      (
        occurrence,
      ) =>
        occurrence.isMine,
    );

  async function handleClaim(
    occurrenceId:
      Id<'choreOccurrences'>,
  ) {
    if (
      claimingOccurrenceId
    ) {
      return;
    }

    setClaimError(
      null,
    );

    setClaimingOccurrenceId(
      occurrenceId,
    );

    try {
      await onClaim(
        occurrenceId,
      );
    } catch (
      error
    ) {
      setClaimError(
        getErrorMessage(
          error,
        ),
      );
    } finally {
      setClaimingOccurrenceId(
        null,
      );
    }
  }

  return (
    <View className="p-5 mt-4 rounded-2xl bg-slate-900">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-semibold text-white">
            Extra chores
          </Text>

          <Text className="mt-1 text-sm leading-5 text-slate-500">
            Finish your responsibilities,
            then claim one extra chore at a
            time.
          </Text>
        </View>

        <View
          className={
            gate.canAccessClaimables
              ? 'px-2 py-1 rounded-lg bg-green-950'
              : 'px-2 py-1 rounded-lg bg-amber-950'
          }
        >
          <Text
            className={
              gate.canAccessClaimables
                ? 'text-xs font-semibold text-green-400'
                : 'text-xs font-semibold text-amber-400'
            }
          >
            {gate.canAccessClaimables
              ? 'Unlocked'
              : 'Locked'}
          </Text>
        </View>
      </View>

      {!gate.canAccessClaimables ? (
        <View className="p-4 mt-4 border rounded-xl border-amber-900 bg-slate-950">
          <Text className="text-sm leading-5 text-slate-400">
            Your current Unlock Chore
            must be approved by a parent
            before new extra chores can
            be claimed.
          </Text>

          {gate.currentUnlockOccurrence ? (
            <View className="mt-3">
              <Text className="text-sm font-semibold text-white">
                Current Unlock Chore
              </Text>

              <Text className="mt-2 text-sm text-slate-400">
                Status:{' '}
                {formatUnlockState(
                  gate
                    .currentUnlockOccurrence
                    .state,
                )}
              </Text>

              <Text className="mt-1 text-xs text-slate-500">
                Scheduled:{' '}
                {
                  gate
                    .currentUnlockOccurrence
                    .scheduledLocalDate
                }
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <ClaimedChoresSection
        claimedOccurrences={
          claimedOccurrences
        }
      />

      {gate.canAccessClaimables ? (
        <View className="mt-5">
          <Text className="text-sm font-semibold text-slate-300">
            Available
          </Text>

          {hasMyActiveClaim ? (
            <Text className="mt-2 text-sm leading-5 text-slate-500">
              Finish your current claimed
              chore before claiming another.
            </Text>
          ) : null}

          {claimError ? (
            <View className="p-3 mt-3 border rounded-xl border-red-900 bg-red-950">
              <Text className="text-sm leading-5 text-red-300">
                {claimError}
              </Text>
            </View>
          ) : null}

          {claimableOccurrences.length ===
          0 ? (
            <View className="p-4 mt-3 rounded-xl bg-slate-950">
              <Text className="font-semibold text-white">
                Nothing available
              </Text>

              <Text className="mt-1 text-sm leading-5 text-slate-500">
                There are no eligible
                Claimable Chores available
                right now.
              </Text>
            </View>
          ) : (
            <View className="mt-3">
              {claimableOccurrences.map(
                (
                  occurrence,
                ) => {
                  const isClaiming =
                    claimingOccurrenceId ===
                    occurrence.occurrenceId;

                  const claimDisabled =
                    hasMyActiveClaim ||
                    claimingOccurrenceId !==
                      null;

                  return (
                    <View
                      key={
                        occurrence.occurrenceId
                      }
                      className="p-4 mb-3 border rounded-xl border-slate-800 bg-slate-950"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="text-base font-semibold text-white">
                            {
                              occurrence.title
                            }
                          </Text>

                          {occurrence.description ? (
                            <Text className="mt-1 text-sm leading-5 text-slate-400">
                              {
                                occurrence.description
                              }
                            </Text>
                          ) : null}
                        </View>

                        <Text className="text-base font-bold text-green-400">
                          {
                            occurrence.valueSek
                          }{' '}
                          kr
                        </Text>
                      </View>

                      <Text className="mt-3 text-xs leading-5 text-slate-500">
                        Deadline:{' '}
                        {formatDeadline(
                          occurrence.deadlineAt,
                          occurrence.timezone,
                        )}
                      </Text>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          isClaiming
                            ? `Claiming ${occurrence.title}`
                            : hasMyActiveClaim
                              ? `Cannot claim ${occurrence.title}: active claim already`
                              : `Claim ${occurrence.title}`
                        }
                        disabled={
                          claimDisabled
                        }
                        onPress={() =>
                          void handleClaim(
                            occurrence.occurrenceId,
                          )
                        }
                        className={
                          claimDisabled
                            ? 'items-center px-4 py-3 mt-4 rounded-xl bg-slate-800'
                            : 'items-center px-4 py-3 mt-4 rounded-xl bg-green-700'
                        }
                      >
                        <Text
                          className={
                            claimDisabled
                              ? 'font-semibold text-slate-500'
                              : 'font-semibold text-white'
                          }
                        >
                          {isClaiming
                            ? 'Claiming…'
                            : hasMyActiveClaim
                              ? 'Active claim already'
                              : 'Claim'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                },
              )}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
