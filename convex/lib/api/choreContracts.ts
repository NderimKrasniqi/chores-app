import {
  v,
} from 'convex/values';

export const choreKindValidator =
  v.union(
    v.literal(
      'personal',
    ),
    v.literal(
      'claimable',
    ),
  );

export const choreOccurrenceStateValidator =
  v.union(
    v.literal(
      'scheduled',
    ),
    v.literal(
      'available',
    ),
    v.literal(
      'submitted',
    ),
    v.literal(
      'redo_required',
    ),
    v.literal(
      'approved',
    ),
    v.literal(
      'missed',
    ),
    v.literal(
      'failed',
    ),
    v.literal(
      'cancelled',
    ),
    v.literal(
      'expired_unclaimed',
    ),
  );

export const personalChoreListItemValidator =
  v.object({
    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    choreDefinitionId:
      v.id(
        'choreDefinitions',
      ),

    title:
      v.string(),

    description:
      v.optional(
        v.string(),
      ),

    valueSek:
      v.number(),

    scheduledLocalDate:
      v.string(),

    timezone:
      v.string(),

    availabilityStartsAt:
      v.number(),

    deadlineAt:
      v.number(),

    state:
      choreOccurrenceStateValidator,

    isUnlockChore:
      v.boolean(),

    canSubmit:
      v.boolean(),
  });

export const personalChoreListValidator =
  v.array(
    personalChoreListItemValidator,
  );

export const personalInitialSubmissionResultValidator =
  v.object({
    submissionId:
      v.id(
        'choreSubmissions',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    submittedAt:
      v.number(),

    state:
      v.literal(
        'submitted',
      ),
  });

export const personalRedoSubmissionResultValidator =
  v.object({
    submissionId:
      v.id(
        'choreSubmissions',
      ),

    redoId:
      v.id(
        'choreRedos',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    submittedAt:
      v.number(),

    attemptNumber:
      v.literal(
        2,
      ),

    state:
      v.literal(
        'submitted',
      ),
  });

export const claimableInitialSubmissionResultValidator =
  v.object({
    submissionId:
      v.id(
        'choreSubmissions',
      ),

    claimId:
      v.id(
        'choreClaims',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    submittedAt:
      v.number(),

    attemptNumber:
      v.literal(
        1,
      ),

    state:
      v.literal(
        'submitted',
      ),
  });

export const claimableRedoSubmissionResultValidator =
  v.object({
    submissionId:
      v.id(
        'choreSubmissions',
      ),

    redoId:
      v.id(
        'choreRedos',
      ),

    claimId:
      v.id(
        'choreClaims',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    submittedAt:
      v.number(),

    attemptNumber:
      v.literal(
        2,
      ),

    state:
      v.literal(
        'submitted',
      ),
  });

export const activeRedoForChildValidator =
  v.object({
    redoId:
      v.id(
        'choreRedos',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    kind:
      choreKindValidator,

    deadlineAt:
      v.number(),

    deadlineLocalDate:
      v.string(),

    deadlineLocalTime:
      v.string(),

    timezone:
      v.string(),

    occurrenceState:
      v.literal(
        'redo_required',
      ),

    canSubmitRedo:
      v.boolean(),
  });

export const activeRedosForChildValidator =
  v.array(
    activeRedoForChildValidator,
  );

export const pendingPersonalReviewValidator =
  v.object({
    submissionId:
      v.id(
        'choreSubmissions',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    childDisplayName:
      v.string(),

    title:
      v.string(),

    description:
      v.optional(
        v.string(),
      ),

    valueSek:
      v.number(),

    scheduledLocalDate:
      v.string(),

    submittedAt:
      v.number(),

    deadlineAt:
      v.number(),

    isUnlockChore:
      v.boolean(),

    hasEvidence:
      v.boolean(),
  });

export const pendingPersonalReviewsValidator =
  v.array(
    pendingPersonalReviewValidator,
  );

export const pendingClaimableReviewValidator =
  v.object({
    submissionId:
      v.id(
        'choreSubmissions',
      ),

    claimId:
      v.id(
        'choreClaims',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    childDisplayName:
      v.string(),

    title:
      v.string(),

    description:
      v.optional(
        v.string(),
      ),

    valueSek:
      v.number(),

    scheduledLocalDate:
      v.string(),

    submittedAt:
      v.number(),

    deadlineAt:
      v.number(),

    timezone:
      v.string(),

    hasEvidence:
      v.boolean(),
  });

export const pendingClaimableReviewsValidator =
  v.array(
    pendingClaimableReviewValidator,
  );

export const pendingRedoReviewValidator =
  v.object({
    submissionId:
      v.id(
        'choreSubmissions',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    kind:
      choreKindValidator,

    childDisplayName:
      v.string(),

    title:
      v.string(),

    description:
      v.optional(
        v.string(),
      ),

    valueSek:
      v.number(),

    submittedAt:
      v.number(),

    redoDeadlineAt:
      v.number(),

    timezone:
      v.string(),

    isUnlockChore:
      v.boolean(),

    hasEvidence:
      v.boolean(),
  });

export const pendingRedoReviewsValidator =
  v.array(
    pendingRedoReviewValidator,
  );

export const personalApprovalResultValidator =
  v.object({
    reviewId:
      v.id(
        'choreReviews',
      ),

    ledgerEntryId:
      v.id(
        'ledgerEntries',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    amountSek:
      v.number(),

    reviewedAt:
      v.number(),

    state:
      v.literal(
        'approved',
      ),
  });

export const claimableApprovalResultValidator =
  v.object({
    reviewId:
      v.id(
        'choreReviews',
      ),

    ledgerEntryId:
      v.id(
        'ledgerEntries',
      ),

    submissionId:
      v.id(
        'choreSubmissions',
      ),

    claimId:
      v.id(
        'choreClaims',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    amountSek:
      v.number(),

    reviewedAt:
      v.number(),

    state:
      v.literal(
        'approved',
      ),
  });

export const initialRejectionResultValidator =
  v.object({
    reviewId:
      v.id(
        'choreReviews',
      ),

    redoId:
      v.id(
        'choreRedos',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    submissionId:
      v.id(
        'choreSubmissions',
      ),

    claimId:
      v.optional(
        v.id(
          'choreClaims',
        ),
      ),

    childId:
      v.id(
        'children',
      ),

    redoDeadlineAt:
      v.number(),

    state:
      v.literal(
        'redo_required',
      ),
  });

export const redoApprovalResultValidator =
  v.object({
    reviewId:
      v.id(
        'choreReviews',
      ),

    ledgerEntryId:
      v.id(
        'ledgerEntries',
      ),

    redoId:
      v.id(
        'choreRedos',
      ),

    submissionId:
      v.id(
        'choreSubmissions',
      ),

    claimId:
      v.optional(
        v.id(
          'choreClaims',
        ),
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    amountSek:
      v.number(),

    reviewedAt:
      v.number(),

    state:
      v.literal(
        'approved',
      ),
  });

export const redoRejectionResultValidator =
  v.object({
    reviewId:
      v.id(
        'choreReviews',
      ),

    redoId:
      v.id(
        'choreRedos',
      ),

    submissionId:
      v.id(
        'choreSubmissions',
      ),

    claimId:
      v.optional(
        v.id(
          'choreClaims',
        ),
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    reviewedAt:
      v.number(),

    state:
      v.literal(
        'failed',
      ),
  });

const claimCommitmentLockReasonValidator =
  v.union(
    v.literal(
      'time_window',
    ),
    v.literal(
      'allowance_exhausted',
    ),
    v.null(),
  );

const claimCommitmentStatusValidator =
  v.object({
    lockAt:
      v.number(),

    isTimeLocked:
      v.boolean(),

    hasUnclaimAllowance:
      v.boolean(),

    remainingUnclaims:
      v.number(),

    canUnclaim:
      v.boolean(),

    isImmediatelyLocked:
      v.boolean(),

    lockReason:
      claimCommitmentLockReasonValidator,
  });

const claimableAccessGateValidator =
  v.object({
    canAccessClaimables:
      v.boolean(),

    reason:
      v.union(
        v.literal(
          'no_current_unlock',
        ),
        v.literal(
          'current_unlock_approved',
        ),
        v.literal(
          'current_unlock_not_approved',
        ),
      ),

    currentUnlockOccurrence:
      v.union(
        v.null(),

        v.object({
          occurrenceId:
            v.id(
              'choreOccurrences',
            ),

          state:
            choreOccurrenceStateValidator,

          scheduledLocalDate:
            v.string(),

          availabilityStartsAt:
            v.number(),

          deadlineAt:
            v.number(),
        }),
      ),
  });

const currentPayoutWeekValidator =
  v.object({
    startLocalDate:
      v.string(),

    endLocalDate:
      v.string(),

    startAt:
      v.number(),

    endAt:
      v.number(),
  });

const claimableOccurrenceValidator =
  v.object({
    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    choreDefinitionId:
      v.id(
        'choreDefinitions',
      ),

    title:
      v.string(),

    description:
      v.optional(
        v.string(),
      ),

    valueSek:
      v.number(),

    scheduledLocalDate:
      v.string(),

    timezone:
      v.string(),

    availabilityStartsAt:
      v.number(),

    deadlineAt:
      v.number(),

    state:
      choreOccurrenceStateValidator,

    commitment:
      claimCommitmentStatusValidator,
  });

const activeClaimStateValidator =
  v.union(
    v.literal(
      'claimed',
    ),
    v.literal(
      'submitted',
    ),
    v.literal(
      'redo_required',
    ),
  );

const claimedOccurrenceValidator =
  v.object({
    claimId:
      v.id(
        'choreClaims',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    claimedByDisplayName:
      v.string(),

    claimState:
      activeClaimStateValidator,

    claimedAt:
      v.number(),

    title:
      v.string(),

    description:
      v.optional(
        v.string(),
      ),

    valueSek:
      v.number(),

    scheduledLocalDate:
      v.string(),

    timezone:
      v.string(),

    deadlineAt:
      v.number(),

    isMine:
      v.boolean(),

    commitment:
      v.union(
        v.null(),
        claimCommitmentStatusValidator,
      ),
  });

export const claimableChoreListValidator =
  v.object({
    gate:
      claimableAccessGateValidator,

    unclaimAllowance:
      v.object({
        allowance:
          v.number(),

        usedUnclaims:
          v.number(),

        remainingUnclaims:
          v.number(),

        payoutWeek:
          currentPayoutWeekValidator,
      }),

    claimableOccurrences:
      v.array(
        claimableOccurrenceValidator,
      ),

    claimedOccurrences:
      v.array(
        claimedOccurrenceValidator,
      ),
  });

export const activeClaimForParentValidator =
  v.object({
    claimId:
      v.id(
        'choreClaims',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    claimedByDisplayName:
      v.string(),

    claimState:
      activeClaimStateValidator,

    claimedAt:
      v.number(),

    title:
      v.string(),

    description:
      v.optional(
        v.string(),
      ),

    valueSek:
      v.number(),

    scheduledLocalDate:
      v.string(),

    timezone:
      v.string(),

    deadlineAt:
      v.number(),
  });

export const activeClaimsForParentValidator =
  v.array(
    activeClaimForParentValidator,
  );

export const claimResultValidator =
  v.object({
    claimId:
      v.id(
        'choreClaims',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    claimedAt:
      v.number(),

    state:
      v.literal(
        'claimed',
      ),

    commitment:
      v.object({
        lockAt:
          v.number(),

        isImmediatelyLocked:
          v.boolean(),

        remainingUnclaims:
          v.number(),

        lockReason:
          claimCommitmentLockReasonValidator,
      }),
  });

const payoutWeekdayValidator =
  v.union(
    v.literal(
      'monday',
    ),
    v.literal(
      'tuesday',
    ),
    v.literal(
      'wednesday',
    ),
    v.literal(
      'thursday',
    ),
    v.literal(
      'friday',
    ),
    v.literal(
      'saturday',
    ),
    v.literal(
      'sunday',
    ),
  );

export const unclaimResultValidator =
  v.object({
    claimId:
      v.id(
        'choreClaims',
      ),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id(
        'children',
      ),

    state:
      v.literal(
        'unclaimed',
      ),

    unclaimedAt:
      v.number(),

    payoutWeek:
      v.object({
        payoutPeriodId:
          v.union(
            v.null(),
            v.id(
              'payoutPeriods',
            ),
          ),

        startLocalDate:
          v.string(),

        endLocalDate:
          v.string(),

        startAt:
          v.number(),

        endAt:
          v.number(),

        timezone:
          v.string(),

        payoutWeekday:
          payoutWeekdayValidator,
      }),

    remainingUnclaims:
      v.number(),
  });
