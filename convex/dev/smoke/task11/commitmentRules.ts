import {
  internalQuery,
} from '../../../_generated/server';
import {
  getClaimCommitmentLockAt,
  getClaimUnclaimStatus,
  getCurrentPayoutWeekWindow,
  isClaimTimeLocked,
} from '../../../lib/claimCommitmentRules';
import { resolveLocalDateTimeToEpochMs } from '../../../lib/choreScheduling';

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (
    !condition
  ) {
    throw new Error(
      message,
    );
  }
}

export const run =
  internalQuery({
    args: {},

    handler: async () => {
      let passed =
        0;

      const deadlineAt =
        Date.UTC(
          2030,
          0,
          15,
          18,
          0,
          0,
        );

      const lockAt =
        getClaimCommitmentLockAt(
          deadlineAt,
        );

      assert(
        lockAt ===
          deadlineAt -
            2 *
              60 *
              60 *
              1000,
        'Lock boundary must be exactly two hours before deadline.',
      );

      passed += 1;

      console.log(
        '✅ 1/10 lock boundary is exactly two hours before deadline',
      );

      assert(
        !isClaimTimeLocked(
          deadlineAt,
          lockAt - 1,
        ),
        'One millisecond before lock boundary must remain unlocked.',
      );

      passed += 1;

      console.log(
        '✅ 2/10 instant before boundary remains unlocked',
      );

      assert(
        isClaimTimeLocked(
          deadlineAt,
          lockAt,
        ),
        'Exact lock boundary must be locked.',
      );

      passed += 1;

      console.log(
        '✅ 3/10 exact boundary is locked',
      );

      assert(
        isClaimTimeLocked(
          deadlineAt,
          lockAt +
            30 *
              60 *
              1000,
        ),
        'Inside the two-hour window must remain locked.',
      );

      passed += 1;

      console.log(
        '✅ 4/10 inside lock window remains locked',
      );

      const allowedStatus =
        getClaimUnclaimStatus({
          deadlineAt,

          now:
            lockAt -
            60 *
              60 *
              1000,

          weeklyUnclaimAllowance:
            2,

          usedUnclaims:
            1,
        });

      assert(
        allowedStatus.canUnclaim,
        'Child with time and allowance remaining should be able to unclaim.',
      );

      assert(
        allowedStatus.remainingUnclaims ===
          1,
        'Exactly one weekly unclaim should remain.',
      );

      passed += 1;

      console.log(
        '✅ 5/10 time plus remaining allowance permits unclaim',
      );

      const exhaustedStatus =
        getClaimUnclaimStatus({
          deadlineAt,

          now:
            lockAt -
            60 *
              60 *
              1000,

          weeklyUnclaimAllowance:
            2,

          usedUnclaims:
            2,
        });

      assert(
        !exhaustedStatus.canUnclaim,
        'Exhausted weekly allowance must prevent unclaim.',
      );

      assert(
        !exhaustedStatus.isTimeLocked,
        'Allowance exhaustion is independent of the time lock.',
      );

      assert(
        exhaustedStatus.remainingUnclaims ===
          0,
        'No weekly unclaims should remain.',
      );

      passed += 1;

      console.log(
        '✅ 6/10 exhausted allowance removes unclaim right independently',
      );

      const overusedStatus =
        getClaimUnclaimStatus({
          deadlineAt,

          now:
            lockAt -
            60 *
              60 *
              1000,

          weeklyUnclaimAllowance:
            1,

          usedUnclaims:
            3,
        });

      assert(
        overusedStatus.remainingUnclaims ===
          0,
        'Remaining allowance must never become negative.',
      );

      passed += 1;

      console.log(
        '✅ 7/10 remaining allowance never becomes negative',
      );

      /*
       * 2030-01-16 is a Wednesday.
       * With Friday payout, the current
       * local Payout Week began Friday
       * 2030-01-11 and ends Friday
       * 2030-01-18.
       */
      const stockholmMidweek =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '12:00',
          'Europe/Stockholm',
        );

      const fridayWindow =
        getCurrentPayoutWeekWindow({
          now:
            stockholmMidweek,

          timezone:
            'Europe/Stockholm',

          payoutWeekday:
            'friday',
        });

      assert(
        fridayWindow.startLocalDate ===
          '2030-01-11',
        'Friday payout week should start on the preceding Friday.',
      );

      assert(
        fridayWindow.endLocalDate ===
          '2030-01-18',
        'Friday payout week should end on the next Friday.',
      );

      passed += 1;

      console.log(
        '✅ 8/10 payout week resolves in Household-local calendar time',
      );

      const exactNextFriday =
        resolveLocalDateTimeToEpochMs(
          '2030-01-18',
          '00:00',
          'Europe/Stockholm',
        );

      const nextFridayWindow =
        getCurrentPayoutWeekWindow({
          now:
            exactNextFriday,

          timezone:
            'Europe/Stockholm',

          payoutWeekday:
            'friday',
        });

      assert(
        nextFridayWindow.startLocalDate ===
          '2030-01-18',
        'Exact payout boundary must begin the new Payout Week.',
      );

      passed += 1;

      console.log(
        '✅ 9/10 exact payout boundary starts the next week',
      );

      /*
       * Europe/Stockholm enters DST on
       * Sunday 2030-03-31.
       *
       * A Sunday-to-Sunday local calendar
       * week therefore contains 167 actual
       * hours, not a hard-coded 168.
       */
      const dstStart =
        resolveLocalDateTimeToEpochMs(
          '2030-03-31',
          '00:00',
          'Europe/Stockholm',
        );

      const dstWindow =
        getCurrentPayoutWeekWindow({
          now:
            dstStart,

          timezone:
            'Europe/Stockholm',

          payoutWeekday:
            'sunday',
        });

      const actualHours =
        (
          dstWindow.endAt -
          dstWindow.startAt
        ) /
        (
          60 *
          60 *
          1000
        );

      assert(
        actualHours ===
          167,
        'DST payout week must follow local calendar boundaries rather than fixed 168-hour arithmetic.',
      );

      passed += 1;

      console.log(
        '✅ 10/10 payout week remains timezone-stable across DST',
      );

      return {
        passed,

        total:
          10,
      };
    },
  });
