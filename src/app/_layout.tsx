import { ServerConnectionBanner } from "@/components/server-connection-banner";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { AuthRuntimeProvider } from "@/providers/auth-runtime-provider";
import { ThemeScope, homeTokens } from "@/design-system";
import {
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/nunito";
import { DefaultTheme, Slot, ThemeProvider } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { lazy, Suspense } from "react";
import { Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplashOverlay } from "@/components/animated-icon";

import "../../global.css";

SplashScreen.preventAutoHideAsync();

// expo-notifications throws as soon as it's imported in Expo Go on Android
// (remote push left Expo Go in SDK 53), which crashed the whole app there.
// Load the push bridge only where push can work; development and store
// builds on Android are unaffected.
const pushSupported = !(
  Platform.OS === "android" &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient
);
const PushRegistrationBridge = pushSupported
  ? lazy(() =>
      import("@/components/notifications/push-registration-bridge").then(
        (module) => ({ default: module.PushRegistrationBridge }),
      ),
    )
  : null;

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: homeTokens.canvas,
    card: homeTokens.surface,
    text: homeTokens.ink,
    primary: homeTokens.action,
    border: homeTokens.line,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  // Keep the native splash up until the Quest Path fonts are ready; the
  // animated overlay hides it once the first frame lays out.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthRuntimeProvider>
        <ConvexClientProvider>
          <ThemeProvider value={navigationTheme}>
            <ThemeScope mode="home">
              {PushRegistrationBridge ? (
                <Suspense fallback={null}>
                  <PushRegistrationBridge />
                </Suspense>
              ) : null}
              <ServerConnectionBanner />
              <Slot />
            </ThemeScope>
          </ThemeProvider>
        </ConvexClientProvider>
        {/* Outside the Convex provider: that remounts on every Parent/Child
            switch, and the launch splash must only ever play once. */}
        <AnimatedSplashOverlay />
      </AuthRuntimeProvider>
    </GestureHandlerRootView>
  );
}
