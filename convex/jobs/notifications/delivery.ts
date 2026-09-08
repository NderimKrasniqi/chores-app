import {
  v,
} from 'convex/values';

import {
  internal,
} from '../../_generated/api';
import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import {
  internalAction,
} from '../../_generated/server';

const EXPO_SEND_URL =
  'https://exp.host/--/api/v2/push/send';

const EXPO_RECEIPTS_URL =
  'https://exp.host/--/api/v2/push/getReceipts';

const RECEIPT_DELAY_MS =
  15 * 60 * 1000;

const MAX_DISPATCH_ATTEMPTS =
  3;

function errorMessage(
  error:
    unknown,
) {
  return error instanceof
    Error
    ? error.message
    : 'Unknown push delivery error.';
}

function asRecord(
  value:
    unknown,
):
  | Record<
      string,
      unknown
    >
  | null {
  if (
    typeof value !==
      'object' ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  return value as
    Record<
      string,
      unknown
    >;
}

function readExpoErrorCode(
  value:
    unknown,
) {
  const record =
    asRecord(
      value,
    );

  const details =
    asRecord(
      record
        ?.details,
    );

  return typeof details
    ?.error ===
    'string'
    ? details.error
    : undefined;
}

function readMessage(
  value:
    unknown,
) {
  const record =
    asRecord(
      value,
    );

  return typeof record
    ?.message ===
    'string'
    ? record.message
    : undefined;
}

function chunk<T>(
  values:
    T[],
  size:
    number,
) {
  const chunks:
    T[][] =
    [];

  for (
    let index = 0;
    index <
    values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index +
          size,
      ),
    );
  }

  return chunks;
}

function notificationData(
  event: {
    kind:
      string;

    occurrenceId?:
      string;

    submissionId?:
      string;

    claimId?:
      string;

    redoId?:
      string;
  },
) {
  return {
    eventKind:
      event.kind,

    ...(event.occurrenceId
      ? {
          occurrenceId:
            event
              .occurrenceId,
        }
      : {}),

    ...(event.submissionId
      ? {
          submissionId:
            event
              .submissionId,
        }
      : {}),

    ...(event.claimId
      ? {
          claimId:
            event.claimId,
        }
      : {}),

    ...(event.redoId
      ? {
          redoId:
            event.redoId,
        }
      : {}),
  };
}

type DispatchContext = {
  event:
    Doc<'notificationEvents'>;

  targets: Array<{
    registrationId:
      Id<'pushRegistrations'>;

    expoPushToken:
      string;
  }>;
};

type PendingReceipt = {
  deliveryId:
    Id<'pushDeliveries'>;

  ticketId:
    string;

  createdAt:
    number;
};

type DispatchResult =
  | {
      sent:
        number;
    }
  | null;

export const dispatchEvent =
  internalAction({
    args: {
      eventId:
        v.id(
          'notificationEvents',
        ),
    },

    returns:
      v.union(
        v.null(),
        v.object({
          sent:
            v.number(),
        }),
      ),

    handler: async (
      ctx,
      args,
    ): Promise<DispatchResult> => {
      const context =
        (await ctx.runQuery(
          internal
            .jobs.notifications.data
            .loadDispatchContext,
          {
            eventId:
              args.eventId,
          },
        )) as
          DispatchContext |
          null;

      if (!context) {
        return null;
      }

      const attempt =
        await ctx.runMutation(
          internal
            .jobs.notifications.data
            .beginDispatchAttempt,
          {
            eventId:
              args.eventId,
          },
        );

      if (
        context.targets
          .length ===
        0
      ) {
        await ctx.runMutation(
          internal
            .jobs.notifications.data
            .finishDispatch,
          {
            eventId:
              args.eventId,
          },
        );

        return {
          sent:
            0,
        };
      }

      let receiptCount =
        0;

      try {
        for (
          const batch
          of chunk(
            context.targets,
            100,
          )
        ) {
          const response =
            await fetch(
              EXPO_SEND_URL,
              {
                method:
                  'POST',

                headers: {
                  accept:
                    'application/json',

                  'content-type':
                    'application/json',
                },

                body:
                  JSON.stringify(
                    batch.map(
                      (
                        target,
                      ) => ({
                        to:
                          target
                            .expoPushToken,

                        title:
                          context
                            .event
                            .title,

                        body:
                          context
                            .event
                            .body,

                        data:
                          notificationData(
                            context
                              .event,
                          ),
                      }),
                    ),
                  ),
              },
            );

          if (
            !response.ok
          ) {
            if (
              response.status ===
                429 ||
              response.status >=
                500
            ) {
              throw new Error(
                `Expo Push Service temporary HTTP ${response.status}.`,
              );
            }

            await ctx.runMutation(
              internal
                .jobs.notifications.data
                .recordDispatchFailure,
              {
                eventId:
                  args
                    .eventId,

                message:
                  `Expo Push Service HTTP ${response.status}.`,

                finished:
                  true,
              },
            );

            return null;
          }

          const payload:
            unknown =
            await response.json();

          const payloadRecord =
            asRecord(
              payload,
            );

          const tickets =
            payloadRecord
              ?.data;

          if (
            !Array.isArray(
              tickets,
            ) ||
            tickets.length !==
              batch.length
          ) {
            throw new Error(
              'Expo Push Service returned an invalid ticket response.',
            );
          }

          for (
            let index = 0;
            index <
            batch.length;
            index += 1
          ) {
            const target =
              batch[index];

            const ticket =
              asRecord(
                tickets[
                  index
                ],
              );

            if (
              ticket
                ?.status ===
                'ok' &&
              typeof ticket.id ===
                'string'
            ) {
              receiptCount +=
                1;

              await ctx.runMutation(
                internal
                  .jobs.notifications.data
                  .recordDeliveryTicket,
                {
                  eventId:
                    args
                      .eventId,

                  registrationId:
                    target
                      .registrationId,

                  expoPushToken:
                    target
                      .expoPushToken,

                  status:
                    'ticket_ok',

                  ticketId:
                    ticket.id,
                },
              );

              continue;
            }

            await ctx.runMutation(
              internal
                .jobs.notifications.data
                .recordDeliveryTicket,
              {
                eventId:
                  args
                    .eventId,

                registrationId:
                  target
                    .registrationId,

                expoPushToken:
                  target
                    .expoPushToken,

                status:
                  'ticket_error',

                ...(readExpoErrorCode(
                  ticket,
                )
                  ? {
                      errorCode:
                        readExpoErrorCode(
                          ticket,
                        ),
                    }
                  : {}),

                ...(readMessage(
                  ticket,
                )
                  ? {
                      errorMessage:
                        readMessage(
                          ticket,
                        ),
                    }
                  : {}),
              },
            );
          }
        }

        await ctx.runMutation(
          internal
            .jobs.notifications.data
            .finishDispatch,
          {
            eventId:
              args.eventId,
          },
        );

        if (
          receiptCount >
          0
        ) {
          await ctx.scheduler.runAfter(
            RECEIPT_DELAY_MS,

            internal
              .jobs.notifications.delivery
              .checkReceipts,

            {
              eventId:
                args
                  .eventId,
            },
          );
        }

        return {
          sent:
            context.targets
              .length,
        };
      } catch (
        error
      ) {
        const retry =
          attempt <
          MAX_DISPATCH_ATTEMPTS;

        await ctx.runMutation(
          internal
            .jobs.notifications.data
            .recordDispatchFailure,
          {
            eventId:
              args.eventId,

            message:
              errorMessage(
                error,
              ),

            finished:
              !retry,
          },
        );

        if (retry) {
          const backoffMs =
            60_000 *
            2 **
              Math.max(
                0,
                attempt -
                  1,
              );

          await ctx.scheduler.runAfter(
            backoffMs,

            internal
              .jobs.notifications.delivery
              .dispatchEvent,

            {
              eventId:
                args
                  .eventId,
            },
          );
        }

        return null;
      }
    },
  });

export const checkReceipts =
  internalAction({
    args: {
      eventId:
        v.id(
          'notificationEvents',
        ),
    },

    returns:
      v.null(),

    handler: async (
      ctx,
      args,
    ): Promise<null> => {
      const pending =
        (await ctx.runQuery(
          internal
            .jobs.notifications.data
            .loadPendingReceipts,
          {
            eventId:
              args.eventId,
          },
        )) as
          PendingReceipt[];

      if (
        pending.length ===
        0
      ) {
        return null;
      }

      for (
        const batch
        of chunk(
          pending,
          1000,
        )
      ) {
        const response =
          await fetch(
            EXPO_RECEIPTS_URL,
            {
              method:
                'POST',

              headers: {
                accept:
                  'application/json',

                'content-type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  ids:
                    batch.map(
                      (
                        item,
                      ) =>
                        item
                          .ticketId,
                    ),
                }),
            },
          );

        if (
          !response.ok
        ) {
          continue;
        }

        const payload:
          unknown =
          await response.json();

        const payloadRecord =
          asRecord(
            payload,
          );

        const receipts =
          asRecord(
            payloadRecord
              ?.data,
          );

        if (!receipts) {
          continue;
        }

        for (
          const item
          of batch
        ) {
          const receipt =
            asRecord(
              receipts[
                item.ticketId
              ],
            );

          if (!receipt) {
            continue;
          }

          if (
            receipt.status ===
            'ok'
          ) {
            await ctx.runMutation(
              internal
                .jobs.notifications.data
                .recordReceipt,
              {
                deliveryId:
                  item
                    .deliveryId,

                status:
                  'receipt_ok',
              },
            );

            continue;
          }

          await ctx.runMutation(
            internal
              .jobs.notifications.data
              .recordReceipt,
            {
              deliveryId:
                item
                  .deliveryId,

              status:
                'receipt_error',

              ...(readExpoErrorCode(
                receipt,
              )
                ? {
                    errorCode:
                      readExpoErrorCode(
                        receipt,
                      ),
                  }
                : {}),

              ...(readMessage(
                receipt,
              )
                ? {
                    errorMessage:
                      readMessage(
                        receipt,
                      ),
                  }
                : {}),
            },
          );
        }
      }

      const remaining =
        (await ctx.runQuery(
          internal
            .jobs.notifications.data
            .loadPendingReceipts,
          {
            eventId:
              args.eventId,
          },
        )) as
          PendingReceipt[];

      if (
        remaining.length >
        0
      ) {
        const oldest =
          Math.min(
            ...remaining.map(
              (
                item,
              ) =>
                item
                  .createdAt,
            ),
          );

        if (
          Date.now() -
            oldest <
          23 *
            60 *
            60 *
            1000
        ) {
          await ctx.scheduler.runAfter(
            RECEIPT_DELAY_MS,

            internal
              .jobs.notifications.delivery
              .checkReceipts,

            {
              eventId:
                args
                  .eventId,
            },
          );
        }
      }

      return null;
    },
  });
