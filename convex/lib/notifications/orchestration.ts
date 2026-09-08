import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';
import {
  getClaimCommitmentLockAt,
} from '../claims/commitmentRules';
import {
  listVisibleClaimableOccurrencesForChild,
} from '../claims/visibility';
import {
  enqueueNotificationEvent,
} from './events';

const DEADLINE_REMINDER_MS =
  60 * 60 * 1000;

const PRE_LOCK_WARNING_MS =
  30 * 60 * 1000;

type NotificationOptions = {
  now?:
    number;

  scheduleDelivery?:
    boolean;
};

function getOptions(
  options?:
    NotificationOptions,
) {
  return {
    now:
      options?.now ??
      Date.now(),

    scheduleDelivery:
      options
        ?.scheduleDelivery ??
      true,
  };
}

export async function notifyParentsOfSubmission(
  ctx:
    MutationCtx,
  submissionId:
    Id<'choreSubmissions'>,
  options?:
    NotificationOptions,
) {
  const {
    now,
    scheduleDelivery,
  } =
    getOptions(
      options,
    );

  const submission =
    await ctx.db.get(
      submissionId,
    );

  if (!submission) {
    return null;
  }

  const occurrence =
    await ctx.db.get(
      submission
        .occurrenceId,
    );

  const child =
    await ctx.db.get(
      submission.childId,
    );

  if (
    !occurrence ||
    !child ||
    occurrence.householdId !==
      submission.householdId ||
    child.householdId !==
      submission.householdId
  ) {
    return null;
  }

  return await enqueueNotificationEvent(
    ctx,
    {
      eventKey:
        `submission-review:${submission._id}`,

      kind:
        'submission_review',

      householdId:
        submission
          .householdId,

      recipientKind:
        'parents',

      title:
        'Review needed',

      body:
        `${child.displayName} submitted ${occurrence.title}.`,

      occurrenceId:
        occurrence._id,

      submissionId:
        submission._id,
    },
    {
      now,
      scheduleDelivery,
    },
  );
}

export async function notifyChildOfApproval(
  ctx:
    MutationCtx,
  reviewId:
    Id<'choreReviews'>,
  options?:
    NotificationOptions,
) {
  const {
    now,
    scheduleDelivery,
  } =
    getOptions(
      options,
    );

  const review =
    await ctx.db.get(
      reviewId,
    );

  if (
    !review ||
    review.decision !==
      'approved'
  ) {
    return null;
  }

  const submission =
    await ctx.db.get(
      review.submissionId,
    );

  const occurrence =
    await ctx.db.get(
      review.occurrenceId,
    );

  if (
    !submission ||
    !occurrence ||
    submission.childId ===
      undefined ||
    submission.householdId !==
      review.householdId ||
    occurrence.householdId !==
      review.householdId
  ) {
    return null;
  }

  const result =
    await enqueueNotificationEvent(
      ctx,
      {
        eventKey:
          `approved:${review._id}`,

        kind:
          'approved',

        householdId:
          review.householdId,

        recipientKind:
          'child',

        childId:
          submission.childId,

        title:
          'Chore approved',

        body:
          `${occurrence.title} earned ${occurrence.valueSek} kr.`,

        occurrenceId:
          occurrence._id,

        submissionId:
          submission._id,
      },
      {
        now,
        scheduleDelivery,
      },
    );

  /*
   * Unlock approval may make already
   * available Claimable Chores newly
   * relevant to this Child.
   */
  if (
    occurrence.kind ===
      'personal' &&
    occurrence
      .isUnlockChore &&
    occurrence
      .personalChildId ===
      submission.childId
  ) {
    const visible =
      await listVisibleClaimableOccurrencesForChild(
        ctx,
        occurrence
          .householdId,
        submission
          .childId,
        now,
      );

    for (
      const claimable
      of visible.occurrences
    ) {
      await enqueueNotificationEvent(
        ctx,
        {
          eventKey:
            `unlock-claimable:${review._id}:${claimable._id}:${submission.childId}`,

          kind:
            'claimable_available',

          householdId:
            occurrence
              .householdId,

          recipientKind:
            'child',

          childId:
            submission
              .childId,

          title:
            'Claimable chore available',

          body:
            `${claimable.title} · ${claimable.valueSek} kr`,

          occurrenceId:
            claimable._id,
        },
        {
          now,
          scheduleDelivery,
        },
      );
    }
  }

  return result;
}

export async function notifyChildRedoRequired(
  ctx:
    MutationCtx,
  redoId:
    Id<'choreRedos'>,
  options?:
    NotificationOptions,
) {
  const {
    now,
    scheduleDelivery,
  } =
    getOptions(
      options,
    );

  const redo =
    await ctx.db.get(
      redoId,
    );

  if (!redo) {
    return null;
  }

  const occurrence =
    await ctx.db.get(
      redo.occurrenceId,
    );

  const initialSubmission =
    await ctx.db.get(
      redo.initialSubmissionId,
    );

  if (
    !occurrence ||
    !initialSubmission ||
    occurrence.householdId !==
      redo.householdId ||
    initialSubmission.householdId !==
      redo.householdId
  ) {
    return null;
  }

  const immediate =
    await enqueueNotificationEvent(
      ctx,
      {
        eventKey:
          `redo-required:${redo._id}`,

        kind:
          'redo_required',

        householdId:
          redo.householdId,

        recipientKind:
          'child',

        childId:
          initialSubmission
            .childId,

        title:
          'Redo requested',

        body:
          `${occurrence.title} needs a redo.`,

        occurrenceId:
          occurrence._id,

        submissionId:
          initialSubmission
            ._id,

        redoId:
          redo._id,
      },
      {
        now,
        scheduleDelivery,
      },
    );

  if (
    redo.deadlineAt >
    now
  ) {
    const scheduledFor =
      Math.max(
        now,
        redo.deadlineAt -
          DEADLINE_REMINDER_MS,
      );

    await enqueueNotificationEvent(
      ctx,
      {
        eventKey:
          `redo-deadline:${redo._id}`,

        kind:
          'redo_deadline_reminder',

        householdId:
          redo.householdId,

        recipientKind:
          'child',

        childId:
          initialSubmission
            .childId,

        title:
          'Redo deadline coming up',

        body:
          `${occurrence.title} redo is due soon.`,

        occurrenceId:
          occurrence._id,

        redoId:
          redo._id,

        scheduledFor,
      },
      {
        now,
        scheduleDelivery,
      },
    );
  }

  return immediate;
}

export async function scheduleClaimNotifications(
  ctx:
    MutationCtx,
  claimId:
    Id<'choreClaims'>,
  options?:
    NotificationOptions,
) {
  const {
    now,
    scheduleDelivery,
  } =
    getOptions(
      options,
    );

  const claim =
    await ctx.db.get(
      claimId,
    );

  if (
    !claim ||
    claim.state !==
      'claimed'
  ) {
    return null;
  }

  const occurrence =
    await ctx.db.get(
      claim.occurrenceId,
    );

  if (
    !occurrence ||
    occurrence.kind !==
      'claimable' ||
    occurrence.householdId !==
      claim.householdId
  ) {
    return null;
  }

  if (
    occurrence.deadlineAt >
    now
  ) {
    const deadlineReminderAt =
      Math.max(
        now,
        occurrence.deadlineAt -
          DEADLINE_REMINDER_MS,
      );

    await enqueueNotificationEvent(
      ctx,
      {
        eventKey:
          `claim-deadline:${claim._id}`,

        kind:
          'deadline_reminder',

        householdId:
          claim.householdId,

        recipientKind:
          'child',

        childId:
          claim.childId,

        title:
          'Deadline coming up',

        body:
          `${occurrence.title} is due soon.`,

        occurrenceId:
          occurrence._id,

        claimId:
          claim._id,

        scheduledFor:
          deadlineReminderAt,
      },
      {
        now,
        scheduleDelivery,
      },
    );
  }

  const lockAt =
    getClaimCommitmentLockAt(
      occurrence.deadlineAt,
    );

  if (
    lockAt >
    now
  ) {
    const preLockAt =
      Math.max(
        now,
        lockAt -
          PRE_LOCK_WARNING_MS,
      );

    await enqueueNotificationEvent(
      ctx,
      {
        eventKey:
          `pre-lock:${claim._id}`,

        kind:
          'pre_lock_reminder',

        householdId:
          claim.householdId,

        recipientKind:
          'child',

        childId:
          claim.childId,

        title:
          'Claim locks soon',

        body:
          `${occurrence.title} becomes locked in about 30 minutes.`,

        occurrenceId:
          occurrence._id,

        claimId:
          claim._id,

        scheduledFor:
          preLockAt,
      },
      {
        now,
        scheduleDelivery,
      },
    );
  }

  return {
    claimId:
      claim._id,
  };
}

export async function scheduleOccurrenceNotifications(
  ctx:
    MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
  options?:
    NotificationOptions,
) {
  const {
    now,
    scheduleDelivery,
  } =
    getOptions(
      options,
    );

  const occurrence =
    await ctx.db.get(
      occurrenceId,
    );

  if (!occurrence) {
    return null;
  }

  if (
    occurrence.deadlineAt <=
    now
  ) {
    return null;
  }

  if (
    occurrence.kind ===
    'personal'
  ) {
    if (
      !occurrence
        .personalChildId
    ) {
      return null;
    }

    const scheduledFor =
      Math.max(
        now,
        occurrence
          .availabilityStartsAt,
        occurrence.deadlineAt -
          DEADLINE_REMINDER_MS,
      );

    await enqueueNotificationEvent(
      ctx,
      {
        eventKey:
          `personal-deadline:${occurrence._id}`,

        kind:
          'deadline_reminder',

        householdId:
          occurrence
            .householdId,

        recipientKind:
          'child',

        childId:
          occurrence
            .personalChildId,

        title:
          'Deadline coming up',

        body:
          `${occurrence.title} is due soon.`,

        occurrenceId:
          occurrence._id,

        scheduledFor,
      },
      {
        now,
        scheduleDelivery,
      },
    );

    return {
      occurrenceId:
        occurrence._id,
    };
  }

  for (
    const childId
    of occurrence
      .eligibleChildIds ??
      []
  ) {
    const scheduledFor =
      Math.max(
        now,
        occurrence
          .availabilityStartsAt,
      );

    if (
      scheduledFor >=
      occurrence.deadlineAt
    ) {
      continue;
    }

    await enqueueNotificationEvent(
      ctx,
      {
        eventKey:
          `claimable-available:${occurrence._id}:${childId}`,

        kind:
          'claimable_available',

        householdId:
          occurrence
            .householdId,

        recipientKind:
          'child',

        childId,

        title:
          'New claimable chore',

        body:
          `${occurrence.title} · ${occurrence.valueSek} kr`,

        occurrenceId:
          occurrence._id,

        scheduledFor,
      },
      {
        now,
        scheduleDelivery,
      },
    );
  }

  return {
    occurrenceId:
      occurrence._id,
  };
}
