import { ServerConnectionBanner } from '@/components/server-connection-banner';
import { PushRegistrationBridge } from '@/components/notifications/push-registration-bridge';
import { ConvexClientProvider } from '@/providers/convex-client-provider';
import { AuthRuntimeProvider } from '@/providers/auth-runtime-provider';
import {
  DarkTheme,
  DefaultTheme,
  Slot,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

import '../../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthRuntimeProvider>
      <ConvexClientProvider>
        <ThemeProvider
          value={
            colorScheme === 'dark'
              ? DarkTheme
              : DefaultTheme
          }
        >
          <PushRegistrationBridge />
          <ServerConnectionBanner />
          <AnimatedSplashOverlay />
          <Slot />
        </ThemeProvider>
      </ConvexClientProvider>
    </AuthRuntimeProvider>
  );
}
