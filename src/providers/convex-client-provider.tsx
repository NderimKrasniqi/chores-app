import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from '@convex-dev/better-auth/react';
import { ConvexReactClient } from 'convex/react';
import type { PropsWithChildren } from 'react';

import { authClient } from '@/lib/auth-client';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('Missing EXPO_PUBLIC_CONVEX_URL');
}

const convex = new ConvexReactClient(convexUrl, {
  expectAuth: true,
  unsavedChangesWarning: false,
});

// Temporary compatibility bridge:
// @convex-dev/better-auth 0.12.5 has stale client typings for
// better-auth >= 1.6.22. Remove when the upstream provider typing is released.
const compatibleAuthClient = authClient as unknown as AuthClient;

export function ConvexClientProvider({ children }: PropsWithChildren) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={compatibleAuthClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
