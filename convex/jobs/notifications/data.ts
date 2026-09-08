import {
  v,
} from 'convex/values';

import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from '../../_generated/server';
import {
  getClaimableAccessGateForChild,
} from '../../lib/claims/accessGate';
import {
  getClaimCommitmentLockAt,
} from '../../lib/claims/commitmentRules';
import {
  disableExpoPushTokenGlobally,
} from '../../lib/notifications/registration';
import {
  resolveNotificationTargets,
} from '../../lib/notifications/recipients';
import schema from '../../schema';

const notificationTargetValidator =
  v.object({
    registrationId:
      v.id(
        'pushRegistrations',
      ),

    expoPushToken:
      v.string(),
  });

const dispatchContextValidator =
  v.union(
    v.null(),

    v.object({
      event:
        schema.doc(
          'notificationEvents',
        ),

      targets:
        v.array(
          notificationTargetValidator,
        ),
    }),
  );

const pendingReceiptValidator =
  v.object({
    deliveryId:
      v.id(
        'pushDeliveries',
      ),

    ticketId:
      v.string(),

    createdAt:
      v.number(),
  });

async function hasBlockingClaim(
  ctx:
    QueryCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
) {
  const claims =
    await ctx.db
      .query(
        'choreClaims',
      )
      .withIndex(
        'by_occurrence',
        (q) =>
          q.eq(
            'occurrenceId',
            occurrenceId,
          ),
      )
      .collect();

  return claims.some(
    (claim) =>
      claim.state !==
        'unclaimed' &&
      claim.state !==
        'cancelled',
  );
}

async function isNotificationEventActionable(
  ctx:
    QueryCtx,
  event:
    Doc<'notificationEvents'>,
  now:
    number,
) {
  if (
    event.kind ===
    'submission_review'
  ) {
    if (
      !event.submissionId
    ) {
      return false;
    }

    const submission =
      await ctx.db.get(
        event.submissionId,
      );

    if (!submission) {
      return false;
    }

    const occurrence =
      await ctx.db.get(
        submission
          .occurrenceId,
      );

    if (
      !occurrence ||
      occurrence.state !==
        'submitted'
    ) {
      return false;
    }

    const review =
      await ctx.db
        .query(
          'choreReviews',
        )
        .withIndex(
          'by_submission',
          (q) =>
            q.eq(
              'submissionId',
              submission._id,
            ),
        )
        .unique();

    return !review;
  }

  if (
    event.kind ===
    'approved'
  ) {
    if (
      !event.occurrenceId ||
      !event.childId
    ) {
      return false;
    }

    const occurrence =
      await ctx.db.get(
        event.occurrenceId,
      );

    return (
      occurrence !==
        null &&
      occurrence.state ===
        'approved' &&
      occurrence.householdId ===
        event.householdId
    );
  }

  if (
    event.kind ===
      'redo_required' ||
    event.kind ===
      'redo_deadline_reminder'
  ) {
    if (
      !event.redoId ||
      !event.childId
    ) {
      return false;
    }

    const redo =
      await ctx.db.get(
        event.redoId,
      );

    if (
      !redo ||
      redo.deadlineAt <
        now
    ) {
      return false;
    }

    const occurrence =
      await ctx.db.get(
        redo.occurrenceId,
      );

    return (
      occurrence !==
        null &&
      occurrence.state ===
        'redo_required' &&
      occurrence.householdId ===
        event.householdId
    );
  }

  if (
    event.kind ===
    'pre_lock_reminder'
  ) {
    if (
      !event.claimId ||
      !event.childId
    ) {
      return false;
    }

    const claim =
      await ctx.db.get(
        event.claimId,
      );

    if (
      !claim ||
      claim.state !==
        'claimed' ||
      claim.childId !==
        event.childId
    ) {
      return false;
    }

    const occurrence =
      await ctx.db.get(
        claim.occurrenceId,
      );

    if (
      !occurrence ||
      occurrence.state !==
        'available' ||
      occurrence.householdId !==
        event.householdId
    ) {
      return false;
    }

    return (
      now <
      getClaimCommitmentLockAt(
        occurrence.deadlineAt,
      )
    );
  }

  if (
    event.kind ===
    'deadline_reminder'
  ) {
    if (
      !event.occurrenceId ||
      !event.childId
    ) {
      return false;
    }

    const occurrence =
      await ctx.db.get(
        event.occurrenceId,
      );

    if (
      !occurrence ||
      occurrence.householdId !==
        event.householdId ||
      now >
        occurrence.deadlineAt
    ) {
      return false;
    }

    if (event.claimId) {
      const claim =
        await ctx.db.get(
          event.claimId,
        );

      return (
        claim !==
          null &&
        claim.state ===
          'claimed' &&
        claim.childId ===
          event.childId &&
        claim.occurrenceId ===
          occurrence._id &&
        occurrence.state ===
          'available'
      );
    }

    return (
      occurrence.kind ===
        'personal' &&
      occurrence.state ===
        'available' &&
      occurrence.personalChildId ===
        event.childId
    );
  }

  if (
    event.kind ===
    'claimable_available'
  ) {
    if (
      !event.occurrenceId ||
      !event.childId
    ) {
      return false;
    }

    const occurrence =
      await ctx.db.get(
        event.occurrenceId,
      );

    if (
      !occurrence ||
      occurrence.kind !==
        'claimable' ||
      occurrence.state !==
        'available' ||
      occurrence.householdId !==
        event.householdId ||
      occurrence.availabilityStartsAt >
        now ||
      now >=
        occurrence.deadlineAt ||
      (
        occurrence
          .eligibleChildIds !==
          undefined &&
        !occurrence
          .eligibleChildIds
          .includes(
            event.childId,
          )
      )
    ) {
      return false;
    }

    if (
      await hasBlockingClaim(
        ctx,
        occurrence._id,
      )
    ) {
      return false;
    }

    const gate =
      await getClaimableAccessGateForChild(
        ctx,
        event.childId,
        now,
      );

    return gate
      .canAccessClaimables;
  }

  return false;
}

export const loadDispatchContext =
  internalQuery({
    args: {
      eventId:
        v.id(
          'notificationEvents',
        ),
    },

    returns:
      dispatchContextValidator,

    handler: async (
      ctx,
      args,
    ) => {
      const event =
        await ctx.db.get(
          args.eventId,
        );

      if (
        !event ||
        event.dispatchedAt !==
          undefined
      ) {
        return null;
      }

      const actionable =
        await isNotificationEventActionable(
          ctx,
          event,
          Date.now(),
        );

      const targets =
        actionable
          ? await resolveNotificationTargets(
              ctx,
              event,
            )
          : [];

      const unsent = [];

      for (
        const target
        of targets
      ) {
        const existing =
          await ctx.db
            .query(
              'pushDeliveries',
            )
            .withIndex(
              'by_event_and_registration',
              (q) =>
                q
                  .eq(
                    'eventId',
                    event._id,
                  )
                  .eq(
                    'registrationId',
                    target
                      .registrationId,
                  ),
            )
            .unique();

        if (!existing) {
          unsent.push(
            target,
          );
        }
      }

      return {
        event,
        targets:
          unsent,
      };
    },
  });

export const beginDispatchAttempt =
  internalMutation({
    args: {
      eventId:
        v.id(
          'notificationEvents',
        ),
    },

    returns:
      v.number(),

    handler: async (
      ctx,
      args,
    ) => {
      const event =
        await ctx.db.get(
          args.eventId,
        );

      if (!event) {
        return 0;
      }

      const nextAttempt =
        event
          .dispatchAttemptCount +
        1;

      await ctx.db.patch(
        event._id,
        {
          dispatchAttemptCount:
            nextAttempt,
        },
      );

      return nextAttempt;
    },
  });

export const recordDeliveryTicket =
  internalMutation({
    args: {
      eventId:
        v.id(
          'notificationEvents',
        ),

      registrationId:
        v.id(
          'pushRegistrations',
        ),

      expoPushToken:
        v.string(),

      status:
        v.union(
          v.literal(
            'ticket_ok',
          ),
          v.literal(
            'ticket_error',
          ),
        ),

      ticketId:
        v.optional(
          v.string(),
        ),

      errorCode:
        v.optional(
          v.string(),
        ),

      errorMessage:
        v.optional(
          v.string(),
        ),
    },

    returns:
      v.id('pushDeliveries'),

    handler: async (
      ctx,
      args,
    ) => {
      const now =
        Date.now();

      const existing =
        await ctx.db
          .query(
            'pushDeliveries',
          )
          .withIndex(
            'by_event_and_registration',
            (q) =>
              q
                .eq(
                  'eventId',
                  args.eventId,
                )
                .eq(
                  'registrationId',
                  args
                    .registrationId,
                ),
          )
          .unique();

      if (existing) {
        return existing._id;
      }

      const deliveryId =
        await ctx.db.insert(
          'pushDeliveries',
          {
            eventId:
              args.eventId,

            registrationId:
              args
                .registrationId,

            expoPushToken:
              args
                .expoPushToken,

            status:
              args.status,

            ...(args.ticketId !==
            undefined
              ? {
                  ticketId:
                    args
                      .ticketId,
                }
              : {}),

            ...(args.errorCode !==
            undefined
              ? {
                  errorCode:
                    args
                      .errorCode,
                }
              : {}),

            ...(args.errorMessage !==
            undefined
              ? {
                  errorMessage:
                    args
                      .errorMessage,
                }
              : {}),

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      if (
        args.errorCode ===
        'DeviceNotRegistered'
      ) {
        await disableExpoPushTokenGlobally(
          ctx,
          args.expoPushToken,
          now,
        );
      }

      return deliveryId;
    },
  });

export const finishDispatch =
  internalMutation({
    args: {
      eventId:
        v.id(
          'notificationEvents',
        ),
    },

    returns:
      v.union(v.null(), v.number()),

    handler: async (
      ctx,
      args,
    ) => {
      const event =
        await ctx.db.get(
          args.eventId,
        );

      if (
        !event ||
        event.dispatchedAt !==
          undefined
      ) {
        return null;
      }

      const now =
        Date.now();

      await ctx.db.patch(
        event._id,
        {
          dispatchedAt:
            now,
        },
      );

      return now;
    },
  });

export const recordDispatchFailure =
  internalMutation({
    args: {
      eventId:
        v.id(
          'notificationEvents',
        ),

      message:
        v.string(),

      finished:
        v.boolean(),
    },

    returns:
      v.union(v.null(), v.number()),

    handler: async (
      ctx,
      args,
    ) => {
      const event =
        await ctx.db.get(
          args.eventId,
        );

      if (!event) {
        return null;
      }

      const now =
        Date.now();

      await ctx.db.patch(
        event._id,
        {
          lastDispatchError:
            args.message.slice(
              0,
              500,
            ),

          ...(args.finished
            ? {
                dispatchedAt:
                  now,
              }
            : {}),
        },
      );

      return now;
    },
  });

export const loadPendingReceipts =
  internalQuery({
    args: {
      eventId:
        v.id(
          'notificationEvents',
        ),
    },

    returns:
      v.array(pendingReceiptValidator),

    handler: async (
      ctx,
      args,
    ) => {
      const deliveries =
        await ctx.db
          .query(
            'pushDeliveries',
          )
          .withIndex(
            'by_event',
            (q) =>
              q.eq(
                'eventId',
                args.eventId,
              ),
          )
          .collect();

      return deliveries
        .filter(
          (
            delivery,
          ) =>
            delivery.status ===
              'ticket_ok' &&
            delivery.ticketId !==
              undefined,
        )
        .map(
          (
            delivery,
          ) => ({
            deliveryId:
              delivery._id,

            ticketId:
              delivery
                .ticketId!,

            createdAt:
              delivery
                .createdAt,
          }),
        );
    },
  });

export const recordReceipt =
  internalMutation({
    args: {
      deliveryId:
        v.id(
          'pushDeliveries',
        ),

      status:
        v.union(
          v.literal(
            'receipt_ok',
          ),
          v.literal(
            'receipt_error',
          ),
        ),

      errorCode:
        v.optional(
          v.string(),
        ),

      errorMessage:
        v.optional(
          v.string(),
        ),
    },

    returns:
      v.union(v.null(), v.number()),

    handler: async (
      ctx,
      args,
    ) => {
      const delivery =
        await ctx.db.get(
          args.deliveryId,
        );

      if (!delivery) {
        return null;
      }

      const now =
        Date.now();

      await ctx.db.patch(
        delivery._id,
        {
          status:
            args.status,

          updatedAt:
            now,

          ...(args.errorCode !==
          undefined
            ? {
                errorCode:
                  args.errorCode,
              }
            : {}),

          ...(args.errorMessage !==
          undefined
            ? {
                errorMessage:
                  args
                    .errorMessage
                    .slice(
                      0,
                      500,
                    ),
              }
            : {}),
        },
      );

      if (
        args.errorCode ===
        'DeviceNotRegistered'
      ) {
        await disableExpoPushTokenGlobally(
          ctx,
          delivery
            .expoPushToken,
          now,
        );
      }

      return now;
    },
  });
