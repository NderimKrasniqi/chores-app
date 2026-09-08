import {
  ConvexError,
} from 'convex/values';

import {
  internal,
} from '../../_generated/api';
import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';

export type NotificationEventKind =
  | 'claimable_available'
  | 'submission_review'
  | 'approved'
  | 'redo_required'
  | 'deadline_reminder'
  | 'redo_deadline_reminder'
  | 'pre_lock_reminder';

export type NotificationEventInput = {
  eventKey:
    string;

  kind:
    NotificationEventKind;

  householdId:
    Id<'households'>;

  recipientKind:
    'parents' |
    'child';

  childId?:
    Id<'children'>;

  title:
    string;

  body:
    string;

  occurrenceId?:
    Id<'choreOccurrences'>;

  submissionId?:
    Id<'choreSubmissions'>;

  claimId?:
    Id<'choreClaims'>;

  redoId?:
    Id<'choreRedos'>;

  scheduledFor?:
    number;
};

export async function enqueueNotificationEvent(
  ctx:
    MutationCtx,
  input:
    NotificationEventInput,
  options?: {
    now?:
      number;

    scheduleDelivery?:
      boolean;
  },
) {
  const now =
    options?.now ??
    Date.now();

  const eventKey =
    input.eventKey.trim();

  if (!eventKey) {
    throw new ConvexError(
      'Notification event key cannot be empty.',
    );
  }

  if (
    input.recipientKind ===
      'child' &&
    !input.childId
  ) {
    throw new ConvexError(
      'Child notification requires a Child recipient.',
    );
  }

  const existing =
    await ctx.db
      .query(
        'notificationEvents',
      )
      .withIndex(
        'by_event_key',
        (q) =>
          q.eq(
            'eventKey',
            eventKey,
          ),
      )
      .unique();

  if (existing) {
    return {
      eventId:
        existing._id,

      created:
        false,
    };
  }

  const scheduledFor =
    input.scheduledFor ??
    now;

  const eventId =
    await ctx.db.insert(
      'notificationEvents',
      {
        eventKey,

        kind:
          input.kind,

        householdId:
          input.householdId,

        recipientKind:
          input
            .recipientKind,

        ...(input.childId !==
        undefined
          ? {
              childId:
                input.childId,
            }
          : {}),

        title:
          input.title,

        body:
          input.body,

        ...(input.occurrenceId !==
        undefined
          ? {
              occurrenceId:
                input
                  .occurrenceId,
            }
          : {}),

        ...(input.submissionId !==
        undefined
          ? {
              submissionId:
                input
                  .submissionId,
            }
          : {}),

        ...(input.claimId !==
        undefined
          ? {
              claimId:
                input.claimId,
            }
          : {}),

        ...(input.redoId !==
        undefined
          ? {
              redoId:
                input.redoId,
            }
          : {}),

        scheduledFor,

        createdAt:
          now,

        dispatchAttemptCount:
          0,
      },
    );

  if (
    options
      ?.scheduleDelivery !==
    false
  ) {
    if (
      scheduledFor >
      now
    ) {
      await ctx.scheduler.runAt(
        scheduledFor,

        internal
          .jobs.notifications.delivery
          .dispatchEvent,

        {
          eventId,
        },
      );
    } else {
      await ctx.scheduler.runAfter(
        0,

        internal
          .jobs.notifications.delivery
          .dispatchEvent,

        {
          eventId,
        },
      );
    }
  }

  return {
    eventId,
    created:
      true,
  };
}
