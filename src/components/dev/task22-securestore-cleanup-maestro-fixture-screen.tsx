import * as SecureStore from 'expo-secure-store';
import {
  useState,
} from 'react';
import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  clearChildAuthStoragePrefix,
  PARENT_AUTH_STORAGE_PREFIX,
} from '@/lib/auth/client';

const CHILD_PREFIX =
  `${PARENT_AUTH_STORAGE_PREFIX}-child-maestro-securestore`;

const CHILD_COOKIE =
  `${CHILD_PREFIX}_cookie`;

const CHILD_SESSION =
  `${CHILD_PREFIX}_session_data`;

const PARENT_COOKIE =
  `${PARENT_AUTH_STORAGE_PREFIX}_cookie`;

const CHUNK_MARKER =
  '\u0001ba-chunks:2';

export function Task22SecureStoreCleanupMaestroFixtureScreen() {
  const [
    result,
    setResult,
  ] = useState<
    'idle' |
    'running' |
    'passed' |
    'failed'
  >(
    'idle',
  );

  async function runCleanupCheck() {
    setResult(
      'running',
    );

    try {
      await SecureStore.setItemAsync(
        PARENT_COOKIE,
        'parent-session-kept',
      );

      await SecureStore.setItemAsync(
        CHILD_COOKIE,
        CHUNK_MARKER,
      );

      await SecureStore.setItemAsync(
        `${CHILD_COOKIE}.0`,
        'child-cookie-part-one',
      );

      await SecureStore.setItemAsync(
        `${CHILD_COOKIE}.1`,
        'child-cookie-part-two',
      );

      await SecureStore.setItemAsync(
        CHILD_SESSION,
        'child-session-cache',
      );

      await clearChildAuthStoragePrefix(
        CHILD_PREFIX,
      );

      const [
        childCookie,
        childCookieChunkZero,
        childCookieChunkOne,
        childSession,
        parentCookie,
      ] =
        await Promise.all([
          SecureStore.getItemAsync(
            CHILD_COOKIE,
          ),

          SecureStore.getItemAsync(
            `${CHILD_COOKIE}.0`,
          ),

          SecureStore.getItemAsync(
            `${CHILD_COOKIE}.1`,
          ),

          SecureStore.getItemAsync(
            CHILD_SESSION,
          ),

          SecureStore.getItemAsync(
            PARENT_COOKIE,
          ),
        ]);

      const passed =
        childCookie === null &&
        childCookieChunkZero ===
          null &&
        childCookieChunkOne ===
          null &&
        childSession === null &&
        parentCookie ===
          'parent-session-kept';

      setResult(
        passed
          ? 'passed'
          : 'failed',
      );
    } catch {
      setResult(
        'failed',
      );
    } finally {
      await SecureStore.deleteItemAsync(
        PARENT_COOKIE,
      );

      await SecureStore.deleteItemAsync(
        CHILD_COOKIE,
      );

      await SecureStore.deleteItemAsync(
        `${CHILD_COOKIE}.0`,
      );

      await SecureStore.deleteItemAsync(
        `${CHILD_COOKIE}.1`,
      );

      await SecureStore.deleteItemAsync(
        CHILD_SESSION,
      );
    }
  }

  return (
    <View className="justify-center flex-1 px-6 bg-slate-950">
      <Text className="text-xs font-semibold tracking-widest text-amber-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-3 text-2xl font-bold text-white">
        TASK-22 SecureStore Cleanup
      </Text>

      <Text className="mt-3 leading-6 text-slate-400">
        Verify revoked Child auth
        storage is removed without
        touching Parent auth storage.
      </Text>

      <Pressable
        testID="task22-run-securestore-cleanup"
        accessibilityRole="button"
        accessibilityLabel="Run SecureStore cleanup check"
        onPress={() => {
          void runCleanupCheck();
        }}
        className="items-center px-4 py-4 mt-6 bg-white rounded-xl"
      >
        <Text className="font-semibold text-slate-950">
          Run cleanup check
        </Text>
      </Pressable>

      {result ===
        'running' && (
        <Text className="mt-5 text-slate-300">
          Running...
        </Text>
      )}

      {result ===
        'passed' && (
        <Text
          testID="task22-securestore-cleanup-passed"
          className="mt-5 font-semibold text-emerald-300"
        >
          SecureStore cleanup passed
        </Text>
      )}

      {result ===
        'failed' && (
        <Text
          testID="task22-securestore-cleanup-failed"
          className="mt-5 font-semibold text-red-300"
        >
          SecureStore cleanup failed
        </Text>
      )}
    </View>
  );
}
