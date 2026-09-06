import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const convexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

if (!convexSiteUrl) {
  throw new Error('Missing EXPO_PUBLIC_CONVEX_SITE_URL');
}

const scheme = Constants.expoConfig?.scheme;

if (typeof scheme !== 'string') {
  throw new Error('Missing Expo app scheme');
}

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [
    expoClient({
      scheme,
      storagePrefix: scheme,
      storage: SecureStore,
    }),
    convexClient(),
  ],
});
