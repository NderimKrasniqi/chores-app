import {
  addLocalDays,
  getWeekday,
  resolveLocalDateTimeToEpochMs,
  type Weekday,
} from './choreScheduling';
import { getLocalDateForInstant } from './householdTime';

const commitmentLockWindowMs =
  2 * 60 * 60 * 1000;

export type PayoutWeekWindow = {
  startLocalDate: string;

  endLocalDate: string;

  startAt: number;

  endAt: number;

  timezone: string;

  payoutWeekday: Weekday;
};

function requireFiniteTimestamp(
  value: number,
  name: string,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `${name} must be a finite timestamp.`,
    );
  }
}

function requireNonNegativeWholeNumber(
  value: number,
  name: string,
) {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value < 0
  ) {
    throw new Error(
      `${name} must be a non-negative whole number.`,
    );
  }
}

function findMostRecentPayoutDate(
  localDate: string,
  payoutWeekday: Weekday,
) {
  for (
    let offset = 0;
    offset < 7;
    offset += 1
  ) {
    const candidate =
      addLocalDays(
        localDate,
        -offset,
      );

    if (
      getWeekday(
        candidate,
      ) ===
      payoutWeekday
    ) {
      return candidate;
    }
  }

  throw new Error(
    'Could not resolve payout-week boundary.',
  );
}

export function getClaimCommitmentLockAt(
  deadlineAt: number,
) {
  requireFiniteTimestamp(
    deadlineAt,
    'deadlineAt',
  );

  return (
    deadlineAt -
    commitmentLockWindowMs
  );
}

export function isClaimTimeLocked(
  deadlineAt: number,
  now: number,
) {
  requireFiniteTimestamp(
    now,
    'now',
  );

  return (
    now >=
    getClaimCommitmentLockAt(
      deadlineAt,
    )
  );
}

export function getClaimUnclaimStatus({
  deadlineAt,
  now,
  weeklyUnclaimAllowance,
  usedUnclaims,
}: {
  deadlineAt: number;

  now: number;

  weeklyUnclaimAllowance:
    number;

  usedUnclaims: number;
}) {
  requireNonNegativeWholeNumber(
    weeklyUnclaimAllowance,
    'weeklyUnclaimAllowance',
  );

  requireNonNegativeWholeNumber(
    usedUnclaims,
    'usedUnclaims',
  );

  const lockAt =
    getClaimCommitmentLockAt(
      deadlineAt,
    );

  requireFiniteTimestamp(
    now,
    'now',
  );

  const isTimeLocked =
    now >= lockAt;

  const remainingUnclaims =
    Math.max(
      weeklyUnclaimAllowance -
        usedUnclaims,
      0,
    );

  const hasUnclaimAllowance =
    remainingUnclaims > 0;

  return {
    lockAt,

    isTimeLocked,

    remainingUnclaims,

    hasUnclaimAllowance,

    canUnclaim:
      !isTimeLocked &&
      hasUnclaimAllowance,
  };
}

export function getCurrentPayoutWeekWindow({
  now,
  timezone,
  payoutWeekday,
}: {
  now: number;

  timezone: string;

  payoutWeekday: Weekday;
}): PayoutWeekWindow {
  requireFiniteTimestamp(
    now,
    'now',
  );

  const currentLocalDate =
    getLocalDateForInstant(
      now,
      timezone,
    );

  /*
   * TASK-11 convention:
   *
   * Until durable payout periods arrive
   * in TASK-15, a Payout Week begins at
   * Household-local 00:00 on the
   * configured payout weekday and ends
   * at the next such boundary.
   *
   * Calendar arithmetic is local-date
   * based, so DST weeks may contain
   * 167 or 169 actual hours.
   */
  const startLocalDate =
    findMostRecentPayoutDate(
      currentLocalDate,
      payoutWeekday,
    );

  const endLocalDate =
    addLocalDays(
      startLocalDate,
      7,
    );

  const startAt =
    resolveLocalDateTimeToEpochMs(
      startLocalDate,
      '00:00',
      timezone,
    );

  const endAt =
    resolveLocalDateTimeToEpochMs(
      endLocalDate,
      '00:00',
      timezone,
    );

  if (
    now < startAt ||
    now >= endAt
  ) {
    throw new Error(
      'Resolved payout week does not contain the requested instant.',
    );
  }

  return {
    startLocalDate,

    endLocalDate,

    startAt,

    endAt,

    timezone,

    payoutWeekday,
  };
}
