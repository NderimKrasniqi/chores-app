import {
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  ServerConnectionNotice,
} from '@/components/server-connection-notice';
import {
  runServerConfirmedAction,
  ServerConfirmationRequiredError,
  type ServerConnectionStatus,
} from '@/hooks/use-server-confirmed-mutation';

export function Task19OfflineRecoveryMaestroFixtureScreen() {
  const [
    status,
    setStatus,
  ] =
    useState<
      ServerConnectionStatus
    >(
      'offline',
    );

  const [
    serverCallCount,
    setServerCallCount,
  ] =
    useState(
      0,
    );

  const [
    actionPending,
    setActionPending,
  ] =
    useState(
      false,
    );

  const [
    result,
    setResult,
  ] =
    useState<
      string | null
    >(
      null,
    );

  async function attemptOfflineAction() {
    setResult(
      null,
    );

    try {
      await runServerConfirmedAction(
        false,
        async () => {
          setServerCallCount(
            (
              current,
            ) =>
              current +
              1,
          );

          return null;
        },
      );
    } catch (
      error
    ) {
      if (
        error instanceof
        ServerConfirmationRequiredError
      ) {
        setResult(
          'Not queued — reconnect and try again.',
        );

        return;
      }

      throw error;
    }
  }

  function beginAction() {
    if (
      status !==
      'online'
    ) {
      return;
    }

    setResult(
      null,
    );

    setActionPending(
      true,
    );
  }

  async function restoreAndConfirm() {
    setStatus(
      'online',
    );

    await runServerConfirmedAction(
      true,
      async () => {
        setServerCallCount(
          (
            current,
          ) =>
            current +
            1,
        );

        return null;
      },
    );

    setActionPending(
      false,
    );

    setResult(
      'Server confirmed the action.',
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-5 pt-16 pb-16"
    >
      <Text className="text-xs font-semibold tracking-widest text-amber-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-2 text-2xl font-bold text-white">
        TASK-19 Offline Recovery Fixture
      </Text>

      <Text className="mt-2 text-sm leading-5 text-slate-400">
        Cached data may remain readable, but consequential actions require live server confirmation.
      </Text>

      <View className="mt-5">
        <ServerConnectionNotice
          status={
            status
          }
          testID="task19-connection-notice"
        />
      </View>

      <View
        testID="task19-cached-data"
        className="p-4 mt-5 border rounded-2xl border-slate-800 bg-slate-900"
      >
        <Text className="text-xs font-semibold tracking-widest text-slate-500">
          LAST SYNCED
        </Text>

        <Text className="mt-2 text-base font-semibold text-white">
          Vacuum hallway
        </Text>

        <Text className="mt-1 text-sm text-slate-300">
          70 kr · due 18:00
        </Text>

        <Text className="mt-2 text-xs leading-5 text-slate-500">
          This information stays visible while offline. It is not proof that the server state has remained unchanged.
        </Text>
      </View>

      {status ===
      'offline' ? (
        <>
          <Pressable
            testID="task19-offline-action"
            accessibilityRole="button"
            onPress={() =>
              void attemptOfflineAction()
            }
            className="items-center px-4 py-3 mt-5 bg-white rounded-xl"
          >
            <Text className="font-semibold text-slate-950">
              Try claim while offline
            </Text>
          </Pressable>

          <Pressable
            testID="task19-reconnect"
            accessibilityRole="button"
            onPress={() => {
              setResult(
                null,
              );

              setStatus(
                'online',
              );
            }}
            className="items-center px-4 py-3 mt-3 rounded-xl bg-slate-800"
          >
            <Text className="font-semibold text-white">
              Simulate reconnect
            </Text>
          </Pressable>
        </>
      ) : null}

      {status ===
        'online' &&
      !actionPending ? (
        <Pressable
          testID="task19-start-action"
          accessibilityRole="button"
          onPress={
            beginAction
          }
          className="items-center px-4 py-3 mt-5 bg-white rounded-xl"
        >
          <Text className="font-semibold text-slate-950">
            Start server-confirmed action
          </Text>
        </Pressable>
      ) : null}

      {actionPending &&
      status ===
        'online' ? (
        <View className="mt-5">
          <View
            testID="task19-checking-server"
            className="p-4 border rounded-xl border-sky-800 bg-sky-950"
          >
            <Text className="font-semibold text-sky-200">
              Checking server…
            </Text>

            <Text className="mt-1 text-sm leading-5 text-sky-300">
              Do not show this action as successful until Convex confirms it.
            </Text>
          </View>

          <Pressable
            testID="task19-drop-connection"
            accessibilityRole="button"
            onPress={() =>
              setStatus(
                'recovering',
              )
            }
            className="items-center px-4 py-3 mt-3 rounded-xl bg-slate-800"
          >
            <Text className="font-semibold text-white">
              Simulate connection loss
            </Text>
          </Pressable>
        </View>
      ) : null}

      {actionPending &&
      status ===
        'recovering' ? (
        <Pressable
          testID="task19-restore-confirm"
          accessibilityRole="button"
          onPress={() =>
            void restoreAndConfirm()
          }
          className="items-center px-4 py-3 mt-5 bg-white rounded-xl"
        >
          <Text className="font-semibold text-slate-950">
            Restore connection and confirm
          </Text>
        </Pressable>
      ) : null}

      <View className="p-4 mt-5 rounded-xl bg-slate-900">
        <Text
          testID="task19-server-call-count"
          className="text-sm text-slate-300"
        >
          Server calls: {serverCallCount}
        </Text>

        {result ? (
          <Text
            testID="task19-action-result"
            className="mt-2 text-sm font-semibold text-white"
          >
            {result}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
