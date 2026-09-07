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

type CommitmentLockReason =
  | 'time_window'
  | 'allowance_exhausted'
  | null;

export type ClaimCommitmentStatus = {
  lockAt:
    number;

  isTimeLocked:
    boolean;

  hasUnclaimAllowance:
    boolean;

  remainingUnclaims:
    number;

  canUnclaim:
    boolean;

  isImmediatelyLocked:
    boolean;

  lockReason:
    CommitmentLockReason;
};

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

  unclaimAllowance: {
    allowance:
      number;

    usedUnclaims:
      number;

    remainingUnclaims:
      number;

    payoutWeek: {
      startLocalDate:
        string;

      endLocalDate:
        string;

      startAt:
        number;

      endAt:
        number;
    };
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

    commitment:
      ClaimCommitmentStatus;
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

    commitment:
      ClaimCommitmentStatus | null;
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

  return 'Could not complete this action. Please try again.';
}

function getImmediateLockMessage(
  commitment:
    ClaimCommitmentStatus,
) {
  if (
    commitment.lockReason ===
    'time_window'
  ) {
    return 'This chore is already inside the two-hour lock window. If you claim it, you will not be able to unclaim it.';
  }

  if (
    commitment.lockReason ===
    'allowance_exhausted'
  ) {
    return 'You have no weekly unclaims remaining. You can still claim this chore, but you will not be able to unclaim it.';
  }

  return 'This claim will be locked immediately and cannot be unclaimed.';
}

function getOwnedClaimLockMessage(
  commitment:
    ClaimCommitmentStatus,
) {
  if (
    commitment.lockReason ===
    'time_window'
  ) {
    return 'The two-hour lock window has started. This claim can no longer be unclaimed.';
  }

  if (
    commitment.lockReason ===
    'allowance_exhausted'
  ) {
    return 'You have no weekly unclaims remaining. This claim can no longer be unclaimed.';
  }

  return 'This claim is locked and can no longer be unclaimed.';
}

function ClaimedChoresSection({
  claimedOccurrences,
  unclaimingClaimId,
  submittingClaimId,
  actionsBusy,
  onUnclaim,
  onSubmit,
}: {
  claimedOccurrences:
    ClaimableChoresViewModel['claimedOccurrences'];

  unclaimingClaimId:
    Id<'choreClaims'> | null;

  submittingClaimId:
    Id<'choreClaims'> | null;

  actionsBusy:
    boolean;

  onUnclaim: (
    claimId:
      Id<'choreClaims'>,
  ) => Promise<void>;

  onSubmit?:
    (
      claimId:
        Id<'choreClaims'>,
    ) => Promise<void>;
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
        ) => {
          const isUnclaiming =
            unclaimingClaimId ===
            occurrence.claimId;

          const isSubmitting =
            submittingClaimId ===
            occurrence.claimId;

          const isOwnedWorkingClaim =
            occurrence.isMine &&
            occurrence.claimState ===
              'claimed';

          const canOfferUnclaim =
            isOwnedWorkingClaim &&
            occurrence.commitment !==
              null;

          const canOfferSubmit =
            isOwnedWorkingClaim &&
            onSubmit !==
              undefined;

          return (
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

              {occurrence.isMine &&
              occurrence.claimState ===
                'submitted' ? (
                <View className="p-3 mt-4 border rounded-xl border-sky-900 bg-sky-950">
                  <Text className="text-sm font-semibold text-sky-300">
                    Waiting for parent approval
                  </Text>

                  <Text className="mt-1 text-xs leading-5 text-sky-200">
                    Your submission is recorded.
                    This chore still uses your
                    active Claim slot until a
                    Parent approves it.
                  </Text>
                </View>
              ) : null}

              {occurrence.isMine &&
              occurrence.claimState ===
                'redo_required' ? (
                <View className="p-3 mt-4 border rounded-xl border-amber-900 bg-amber-950">
                  <Text className="text-sm font-semibold text-amber-300">
                    Redo required
                  </Text>

                  <Text className="mt-1 text-xs leading-5 text-amber-200">
                    This Claim remains active.
                    Redo actions arrive in
                    TASK-13.
                  </Text>
                </View>
              ) : null}

              {canOfferUnclaim &&
              occurrence.commitment ? (
                occurrence.commitment
                  .canUnclaim ? (
                  <View className="mt-4">
                    <Text className="text-xs leading-5 text-slate-500">
                      Unclaim available
                      until:{' '}
                      {formatDeadline(
                        occurrence
                          .commitment
                          .lockAt,
                        occurrence
                          .timezone,
                      )}
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Unclaim ${occurrence.title}`}
                      disabled={
                        actionsBusy
                      }
                      onPress={() =>
                        void onUnclaim(
                          occurrence
                            .claimId,
                        )
                      }
                      className={
                        actionsBusy
                          ? 'items-center px-4 py-3 mt-3 rounded-xl bg-slate-800'
                          : 'items-center px-4 py-3 mt-3 rounded-xl bg-amber-800'
                      }
                    >
                      <Text
                        className={
                          actionsBusy
                            ? 'font-semibold text-slate-500'
                            : 'font-semibold text-white'
                        }
                      >
                        {isUnclaiming
                          ? 'Unclaiming…'
                          : 'Unclaim'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="p-3 mt-4 border rounded-xl border-amber-900 bg-amber-950">
                    <Text className="text-sm font-semibold text-amber-300">
                      Locked commitment
                    </Text>

                    <Text className="mt-1 text-xs leading-5 text-amber-200">
                      {getOwnedClaimLockMessage(
                        occurrence.commitment,
                      )}
                    </Text>
                  </View>
                )
              ) : null}

              {canOfferSubmit ? (
                <View className="pt-4 mt-4 border-t border-slate-800">
                  <Text className="text-xs leading-5 text-slate-500">
                    Submit when the work is
                    finished. Parent approval is
                    required before you earn{' '}
                    {
                      occurrence.valueSek
                    }{' '}
                    kr.
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Submit ${occurrence.title} for review`}
                    disabled={
                      actionsBusy
                    }
                    onPress={() =>
                      void onSubmit(
                        occurrence
                          .claimId,
                      )
                    }
                    className={
                      actionsBusy
                        ? 'items-center px-4 py-3 mt-3 rounded-xl bg-slate-800'
                        : 'items-center px-4 py-3 mt-3 bg-white rounded-xl'
                    }
                  >
                    <Text
                      className={
                        actionsBusy
                          ? 'font-semibold text-slate-500'
                          : 'font-semibold text-slate-950'
                      }
                    >
                      {isSubmitting
                        ? 'Submitting…'
                        : 'Submit for review'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        },
      )}
    </View>
  );
}

export function ClaimableChoresView({
  result,
  onClaim,
  onUnclaim,
  onSubmit,
}: {
  result:
    ClaimableChoresViewModel;

  onClaim: (
    occurrenceId:
      Id<'choreOccurrences'>,
    acceptImmediateLock:
      boolean,
  ) => Promise<void>;

  onUnclaim: (
    claimId:
      Id<'choreClaims'>,
  ) => Promise<void>;

  onSubmit?:
    (
      claimId:
        Id<'choreClaims'>,
    ) => Promise<void>;
}) {
  const {
    gate,
    unclaimAllowance,
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
    unclaimingClaimId,
    setUnclaimingClaimId,
  ] =
    useState<
      Id<'choreClaims'> | null
    >(null);

  const [
    submittingClaimId,
    setSubmittingClaimId,
  ] =
    useState<
      Id<'choreClaims'> | null
    >(null);

  const [
    pendingLockedOccurrenceId,
    setPendingLockedOccurrenceId,
  ] =
    useState<
      Id<'choreOccurrences'> | null
    >(null);

  const [
    actionError,
    setActionError,
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

  const actionsBusy =
    claimingOccurrenceId !==
      null ||
    unclaimingClaimId !==
      null ||
    submittingClaimId !==
      null;

  async function executeClaim(
    occurrenceId:
      Id<'choreOccurrences'>,
    acceptImmediateLock:
      boolean,
  ) {
    if (actionsBusy) {
      return;
    }

    setActionError(
      null,
    );

    setClaimingOccurrenceId(
      occurrenceId,
    );

    try {
      await onClaim(
        occurrenceId,
        acceptImmediateLock,
      );

      setPendingLockedOccurrenceId(
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
      setClaimingOccurrenceId(
        null,
      );
    }
  }

  function beginClaim(
    occurrence:
      ClaimableChoresViewModel['claimableOccurrences'][number],
  ) {
    if (
      actionsBusy ||
      hasMyActiveClaim
    ) {
      return;
    }

    setActionError(
      null,
    );

    if (
      occurrence.commitment
        .isImmediatelyLocked
    ) {
      setPendingLockedOccurrenceId(
        occurrence
          .occurrenceId,
      );

      return;
    }

    void executeClaim(
      occurrence.occurrenceId,
      false,
    );
  }

  async function handleUnclaim(
    claimId:
      Id<'choreClaims'>,
  ) {
    if (actionsBusy) {
      return;
    }

    setActionError(
      null,
    );

    setUnclaimingClaimId(
      claimId,
    );

    try {
      await onUnclaim(
        claimId,
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
      setUnclaimingClaimId(
        null,
      );
    }
  }

  async function handleSubmit(
    claimId:
      Id<'choreClaims'>,
  ) {
    if (
      actionsBusy ||
      !onSubmit
    ) {
      return;
    }

    setActionError(
      null,
    );

    setSubmittingClaimId(
      claimId,
    );

    try {
      await onSubmit(
        claimId,
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
      setSubmittingClaimId(
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

      <View className="p-3 mt-4 rounded-xl bg-slate-950">
        <Text className="text-sm font-semibold text-slate-300">
          Weekly unclaims
        </Text>

        <Text className="mt-1 text-sm text-slate-400">
          {
            unclaimAllowance.remainingUnclaims
          }{' '}
          of{' '}
          {
            unclaimAllowance.allowance
          }{' '}
          remaining
        </Text>

        {unclaimAllowance
          .remainingUnclaims ===
        0 ? (
          <Text className="mt-1 text-xs leading-5 text-amber-300">
            You can still claim extra
            chores, but new claims will be
            locked immediately.
          </Text>
        ) : null}
      </View>

      {actionError ? (
        <View className="p-3 mt-4 border rounded-xl border-red-900 bg-red-950">
          <Text className="text-sm leading-5 text-red-300">
            {actionError}
          </Text>
        </View>
      ) : null}

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
        unclaimingClaimId={
          unclaimingClaimId
        }
        submittingClaimId={
          submittingClaimId
        }
        actionsBusy={
          actionsBusy
        }
        onUnclaim={
          handleUnclaim
        }
        onSubmit={
          onSubmit
            ? handleSubmit
            : undefined
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

                  const isConfirmingLocked =
                    pendingLockedOccurrenceId ===
                    occurrence.occurrenceId;

                  const claimDisabled =
                    hasMyActiveClaim ||
                    actionsBusy;

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

                      {occurrence
                        .commitment
                        .isImmediatelyLocked ? (
                        <Text className="mt-1 text-xs font-medium text-amber-300">
                          Immediate commitment
                          lock
                        </Text>
                      ) : (
                        <Text className="mt-1 text-xs text-slate-500">
                          Unclaim until:{' '}
                          {formatDeadline(
                            occurrence
                              .commitment
                              .lockAt,
                            occurrence
                              .timezone,
                          )}
                        </Text>
                      )}

                      {isConfirmingLocked ? (
                        <View className="p-3 mt-4 border rounded-xl border-amber-800 bg-amber-950">
                          <Text className="text-sm font-semibold text-amber-300">
                            This claim will
                            be locked
                            immediately
                          </Text>

                          <Text className="mt-1 text-xs leading-5 text-amber-200">
                            {getImmediateLockMessage(
                              occurrence.commitment,
                            )}
                          </Text>

                          <View className="flex-row mt-3">
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Cancel locked claim ${occurrence.title}`}
                              disabled={
                                actionsBusy
                              }
                              onPress={() =>
                                setPendingLockedOccurrenceId(
                                  null,
                                )
                              }
                              className="items-center flex-1 px-3 py-3 mr-2 rounded-xl bg-slate-800"
                            >
                              <Text className="font-semibold text-white">
                                Cancel
                              </Text>
                            </Pressable>

                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Confirm locked claim ${occurrence.title}`}
                              disabled={
                                actionsBusy
                              }
                              onPress={() =>
                                void executeClaim(
                                  occurrence
                                    .occurrenceId,
                                  true,
                                )
                              }
                              className={
                                actionsBusy
                                  ? 'items-center flex-1 px-3 py-3 rounded-xl bg-slate-800'
                                  : 'items-center flex-1 px-3 py-3 rounded-xl bg-amber-700'
                              }
                            >
                              <Text
                                className={
                                  actionsBusy
                                    ? 'font-semibold text-slate-500'
                                    : 'font-semibold text-white'
                                }
                              >
                                {isClaiming
                                  ? 'Claiming…'
                                  : 'Claim anyway'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            isClaiming
                              ? `Claiming ${occurrence.title}`
                              : hasMyActiveClaim
                                ? `Cannot claim ${occurrence.title}: active claim already`
                                : occurrence
                                      .commitment
                                      .isImmediatelyLocked
                                  ? `Review locked claim ${occurrence.title}`
                                  : `Claim ${occurrence.title}`
                          }
                          disabled={
                            claimDisabled
                          }
                          onPress={() =>
                            beginClaim(
                              occurrence,
                            )
                          }
                          className={
                            claimDisabled
                              ? 'items-center px-4 py-3 mt-4 rounded-xl bg-slate-800'
                              : occurrence
                                    .commitment
                                    .isImmediatelyLocked
                                ? 'items-center px-4 py-3 mt-4 rounded-xl bg-amber-700'
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
                      )}
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
