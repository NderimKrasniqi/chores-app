import { ServerConnectionBanner } from "@/components/server-connection-banner";
import { PushRegistrationBridge } from "@/components/notifications/push-registration-bridge";
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
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplashOverlay } from "@/components/animated-icon";

import "../../global.css";

SplashScreen.preventAutoHideAsync();

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
    <AuthRuntimeProvider>
      <ConvexClientProvider>
        <ThemeProvider value={navigationTheme}>
          <ThemeScope mode="home">
            <PushRegistrationBridge />
            <ServerConnectionBanner />
            <AnimatedSplashOverlay />
            <Slot />
          </ThemeScope>
        </ThemeProvider>
      </ConvexClientProvider>
    </AuthRuntimeProvider>
  );
}
