import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { anonymousClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const convexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

if (!convexSiteUrl) {
  throw new Error('Missing EXPO_PUBLIC_CONVEX_SITE_URL');
}

function getAppScheme(): string {
  const configuredScheme = Constants.expoConfig?.scheme;

  if (typeof configuredScheme !== 'string') {
    throw new Error('Expected exactly one Expo app scheme.');
  }

  return configuredScheme;
}

const appScheme = getAppScheme();

/**
 * Keep the existing storage prefix for the Parent/default
 * authentication context so existing Parent sessions continue
 * to use the same SecureStore keys.
 */
export const PARENT_AUTH_STORAGE_PREFIX = appScheme;

const BETTER_AUTH_CHUNK_MARKER =
  '\u0001ba-chunks:';

function normalizeBetterAuthStorageKey(
  key: string,
) {
  return key.replace(
    /:/g,
    '_',
  );
}

async function deleteBetterAuthSecureStoreValue(
  key: string,
) {
  const normalizedKey =
    normalizeBetterAuthStorageKey(
      key,
    );

  const stored =
    await SecureStore.getItemAsync(
      normalizedKey,
    );

  if (
    stored?.startsWith(
      BETTER_AUTH_CHUNK_MARKER,
    )
  ) {
    const chunkCount =
      Number(
        stored.slice(
          BETTER_AUTH_CHUNK_MARKER.length,
        ),
      );

    if (
      Number.isSafeInteger(
        chunkCount,
      ) &&
      chunkCount > 0 &&
      chunkCount <= 1024
    ) {
      for (
        let index = 0;
        index < chunkCount;
        index += 1
      ) {
        await SecureStore.deleteItemAsync(
          `${normalizedKey}.${index}`,
        );
      }
    }
  }

  await SecureStore.deleteItemAsync(
    normalizedKey,
  );
}

export async function clearChildAuthStoragePrefix(
  storagePrefix: string,
) {
  const normalized =
    storagePrefix.trim();

  if (!normalized) {
    throw new Error(
      'Child auth storage prefix cannot be empty.',
    );
  }

  if (
    normalized ===
    PARENT_AUTH_STORAGE_PREFIX
  ) {
    throw new Error(
      'Parent auth storage cannot be cleared as Child storage.',
    );
  }

  const expectedChildPrefix =
    `${PARENT_AUTH_STORAGE_PREFIX}-child-`;

  if (
    !normalized.startsWith(
      expectedChildPrefix,
    )
  ) {
    throw new Error(
      'Invalid Child auth storage prefix.',
    );
  }

  await Promise.all([
    deleteBetterAuthSecureStoreValue(
      `${normalized}_cookie`,
    ),

    deleteBetterAuthSecureStoreValue(
      `${normalized}_session_data`,
    ),
  ]);
}

export function createAppAuthClient(storagePrefix: string) {
  return createAuthClient({
    baseURL: convexSiteUrl,

    plugins: [
      expoClient({
        scheme: appScheme,
        storagePrefix,
        storage: SecureStore,
      }),

      anonymousClient(),

      convexClient(),
    ],
  });
}

export type AppAuthClient = ReturnType<typeof createAppAuthClient>;

/**
 * Live module binding for the currently active local
 * authentication context.
 */
export let authClient = createAppAuthClient(PARENT_AUTH_STORAGE_PREFIX);

export function activateAuthStoragePrefix(storagePrefix: string) {
  const normalized = storagePrefix.trim();

  if (!normalized) {
    throw new Error('Auth storage prefix cannot be empty.');
  }

  authClient = createAppAuthClient(normalized);

  return authClient;
}
