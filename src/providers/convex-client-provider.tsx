import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from '@convex-dev/better-auth/react';
import { ConvexReactClient } from 'convex/react';
import type { PropsWithChildren } from 'react';

import { useAuthRuntime } from '@/providers/auth-runtime-provider';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('Missing EXPO_PUBLIC_CONVEX_URL');
}

const convex = new ConvexReactClient(convexUrl, {
  expectAuth: true,
  unsavedChangesWarning: false,
});

export function ConvexClientProvider({ children }: PropsWithChildren) {
  const { authClient, storagePrefix } = useAuthRuntime();

  /*
   * Temporary compatibility bridge:
   *
   * @convex-dev/better-auth 0.12.5 has stale
   * client typings for newer Better Auth versions.
   */
  const compatibleAuthClient = authClient as unknown as AuthClient;

  /*
   * Changing storagePrefix intentionally remounts the
   * auth bridge so Convex cannot retain authorization
   * state from the previously active local context.
   */
  return (
    <ConvexBetterAuthProvider
      key={storagePrefix}
      client={convex}
      authClient={compatibleAuthClient}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
