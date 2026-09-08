import {
  useConvexConnectionState,
  useMutation,
  type ReactMutation,
} from 'convex/react';
import type {
  FunctionReference,
  OptionalRestArgs,
} from 'convex/server';
import {
  useCallback,
} from 'react';

export type ServerConnectionStatus =
  | 'connecting'
  | 'online'
  | 'offline'
  | 'recovering';

export class ServerConfirmationRequiredError
  extends Error {
  constructor() {
    super(
      'This action needs a live server connection. It was not queued. Reconnect and try again.',
    );

    this.name =
      'ServerConfirmationRequiredError';
  }
}

export async function runServerConfirmedAction<
  Result,
>(
  isServerConnected:
    boolean,
  execute:
    () => Promise<Result>,
): Promise<Result> {
  if (
    !isServerConnected
  ) {
    throw new ServerConfirmationRequiredError();
  }

  return await execute();
}

export function useServerConnectionStatus() {
  const connection =
    useConvexConnectionState();

  let status:
    ServerConnectionStatus;

  if (
    connection
      .isWebSocketConnected
  ) {
    status =
      'online';
  } else if (
    connection
      .inflightMutations >
    0
  ) {
    status =
      'recovering';
  } else if (
    connection.hasEverConnected
  ) {
    status =
      'offline';
  } else {
    status =
      'connecting';
  }

  return {
    status,

    isServerConnected:
      connection
        .isWebSocketConnected,

    canStartConsequentialAction:
      connection
        .isWebSocketConnected,

    hasInflightMutation:
      connection
        .inflightMutations >
      0,
  };
}

export function useServerConfirmedMutation<
  Mutation extends
    FunctionReference<'mutation'>,
>(
  mutation:
    Mutation,
): ReactMutation<Mutation> {
  const execute =
    useMutation(
      mutation,
    );

  const {
    isServerConnected,
  } =
    useServerConnectionStatus();

  const guarded =
    useCallback(
      async (
        ...args:
          OptionalRestArgs<Mutation>
      ) => {
        return await runServerConfirmedAction(
          isServerConnected,
          async () =>
            await execute(
              ...args,
            ),
        );
      },
      [
        execute,
        isServerConnected,
      ],
    );

  return guarded as
    ReactMutation<Mutation>;
}
