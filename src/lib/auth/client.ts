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
