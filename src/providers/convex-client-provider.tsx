import { ConvexProvider, ConvexReactClient } from 'convex/react';
import type { PropsWithChildren } from 'react';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('Missing EXPO_PUBLIC_CONVEX_URL');
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: PropsWithChildren) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
