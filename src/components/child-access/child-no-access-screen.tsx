import {
  getLocalChildContextByStoragePrefix,
  removeLocalChildContext,
} from '@/lib/child-access/local-access';
import { forgetLocalChildGrant } from '@/lib/child-access/grant-status';
import { setChildExplicitlyLocked } from '@/lib/child-access/unlock-policy';
import { useAuthRuntime } from '@/providers/auth-runtime-provider';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

import { ChildJoinScreen } from './child-join-screen';

type CleanupState =
  | 'checking'
  | 'join'
  | 'cleaning'
  | 'error';

export function ChildNoAccessScreen() {
  const {
    authClient,
    storagePrefix,
    activateParentStorage,
  } = useAuthRuntime();

  const [
    cleanupState,
    setCleanupState,
  ] =
    useState<CleanupState>(
      'checking',
    );

  const [
    cleanupAttempt,
    setCleanupAttempt,
  ] = useState(0);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled =
      false;

    async function reconcileAccess() {
      setCleanupState(
        'checking',
      );

      setErrorMessage(
        null,
      );

      try {
        const localContext =
          await getLocalChildContextByStoragePrefix(
            storagePrefix,
          );

        if (cancelled) {
          return;
        }

        /*
         * Fresh anonymous Child session:
         * nothing has been paired locally yet.
         */
        if (!localContext) {
          setCleanupState(
            'join',
          );

          return;
        }

        /*
         * A saved Child context exists, but
         * Convex says the active device grant
         * is gone or revoked.
         */
        setCleanupState(
          'cleaning',
        );

        const signOutResult =
          await authClient.signOut();

        if (
          signOutResult.error
        ) {
          throw new Error(
            signOutResult.error
              .message ??
              'Could not clear revoked Child session.',
          );
        }

        await removeLocalChildContext(
          localContext.contextId,
        );

        await forgetLocalChildGrant(
          localContext.contextId,
        );

        await setChildExplicitlyLocked(
          localContext.childId,
          false,
        );

        if (cancelled) {
          return;
        }

        activateParentStorage();
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCleanupState(
          'error',
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not remove revoked Child access.',
        );
      }
    }

    void reconcileAccess();

    return () => {
      cancelled =
        true;
    };
  }, [
    authClient,
    storagePrefix,
    activateParentStorage,
    cleanupAttempt,
  ]);

  if (
    cleanupState ===
    'join'
  ) {
    return (
      <ChildJoinScreen />
    );
  }

  if (
    cleanupState ===
    'error'
  ) {
    return (
      <View className="justify-center flex-1 px-6 bg-slate-950">
        <Text className="text-2xl font-bold text-white">
          Could not clear
          Child access
        </Text>

        <Text className="mt-3 leading-6 text-red-400">
          {errorMessage}
        </Text>

        <Pressable
          className="px-4 py-4 mt-6 bg-white rounded-xl"
          onPress={() =>
            setCleanupAttempt(
              (
                current,
              ) =>
                current +
                1,
            )
          }
        >
          <Text className="font-semibold text-center text-slate-950">
            Retry cleanup
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="items-center justify-center flex-1 px-6 bg-slate-950">
      <ActivityIndicator />

      <Text className="mt-3 text-center text-slate-400">
        {cleanupState ===
        'cleaning'
          ? 'Removing revoked Child access...'
          : 'Checking Child access...'}
      </Text>
    </View>
  );
}
