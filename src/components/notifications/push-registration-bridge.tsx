import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { reportPushRegistrationFailure } from "@/lib/notifications/push-observability";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useConvexAuth } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Modal, Platform, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { useLoop } from "@/components/art";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { setNotificationIntent } from "@/lib/notification-intent";

import { api } from "../../../convex/_generated/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,

    shouldSetBadge: false,

    shouldShowBanner: true,

    shouldShowList: true,
  }),
});

function getExpoProjectId() {
  const extra = Constants.expoConfig?.extra as
    | {
        eas?: {
          projectId?: string;
        };
      }
    | undefined;

  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

const PRIMER_KEY = "notification-primer-dismissed-at";
const PRIMER_SNOOZE_MS = 7 * 86_400_000;

/** Record taps on notifications (including the one that opened the app). */
function useNotificationTaps() {
  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          setNotificationIntent(
            response.notification.request.identifier,
            response.notification.request.content.data,
          );
        }
      })
      .catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        setNotificationIntent(
          response.notification.request.identifier,
          response.notification.request.content.data,
        );
      },
    );
    return () => subscription.remove();
  }, []);
}

/** A ringing bell for the notification primer. */
function Bell() {
  const { tokens } = useTheme();
  const ring = useLoop({ duration: 1400, reverse: true, rest: 0.5 });
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(ring.get(), [0, 1], [-12, 12])}deg` }],
  }));
  return (
    <Animated.View
      style={[{ alignSelf: "center", transformOrigin: "center top" }, style]}
    >
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Path
          d="M48 14c-15 0-26 11-26 27v17l-7 11h66l-7-11V41c0-16-11-27-26-27z"
          fill={tokens.reward}
        />
        <Circle cx={48} cy={78} r={8} fill={tokens.reward} />
        <Circle cx={72} cy={24} r={11} fill={tokens.urgency} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Explains notifications before the one-time system prompt, so it isn't a
 * cold pop-up in the middle of setup. "Not now" asks again after a week.
 */
function NotificationPrimer({
  visible,
  onEnable,
  onLater,
}: {
  visible: boolean;
  onEnable: () => void;
  onLater: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onLater}
    >
      <View className="flex-1 justify-end bg-scrim">
        <View
          className="rounded-t-sheet px-6 pb-10 pt-8"
          style={{ backgroundColor: tokens.canvas }}
        >
          <Bell />
          <AppText variant="sectionTitle" className="mt-4 text-center">
            Want a heads-up?
          </AppText>
          <AppText color="ink-muted" className="mt-2 text-center">
            We’ll tell you when work is approved or needs a redo, when a
            deadline is close, and when new Extras appear. Parents hear when
            there’s something to check.
          </AppText>
          <ActionButton
            className="mt-6"
            label="Turn on notifications"
            onPress={onEnable}
          />
          <ActionButton
            className="mt-1"
            tone="quiet"
            label="Not now"
            onPress={onLater}
          />
        </View>
      </View>
    </Modal>
  );
}

export function PushRegistrationBridge() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  useNotificationTaps();
  // null = not decided yet; "ask" = show primer; "go" = allowed to prompt.
  const [primer, setPrimer] = useState<"ask" | "go" | "skip" | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    let cancelled = false;
    void (async () => {
      const permissions = await Notifications.getPermissionsAsync();
      if (permissions.status !== "undetermined") {
        if (!cancelled) setPrimer("go");
        return;
      }
      const dismissedAt = Number(
        (await SecureStore.getItemAsync(PRIMER_KEY).catch(() => null)) ?? 0,
      );
      if (cancelled) return;
      setPrimer(Date.now() - dismissedAt < PRIMER_SNOOZE_MS ? "skip" : "ask");
    })().catch(() => {
      if (!cancelled) setPrimer("skip");
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  const registerDevice = useServerConfirmedMutation(
    api.pushNotifications.registerCurrentDevice,
  );

  useEffect(() => {
    if (isLoading || !isAuthenticated || primer !== "go") {
      return;
    }

    let cancelled = false;

    let tokenSubscription: Notifications.EventSubscription | undefined;

    async function register() {
      if (Platform.OS !== "ios" && Platform.OS !== "android") {
        return;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Chores",

          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      let permissions = await Notifications.getPermissionsAsync();

      if (!permissions.granted && permissions.status === "undetermined") {
        permissions = await Notifications.requestPermissionsAsync();
      }

      if (!permissions.granted) {
        return;
      }

      const projectId = getExpoProjectId();

      if (!projectId) {
        reportPushRegistrationFailure("missing_project_id");

        return;
      }

      const resolvedProjectId: string = projectId;

      async function persistToken() {
        let token: Notifications.ExpoPushToken;

        try {
          token = await Notifications.getExpoPushTokenAsync({
            projectId: resolvedProjectId,
          });
        } catch {
          reportPushRegistrationFailure("token_acquisition");

          return;
        }

        if (cancelled) {
          return;
        }

        try {
          await registerDevice({
            expoPushToken: token.data,

            platform: Platform.OS as "ios" | "android",
          });
        } catch {
          reportPushRegistrationFailure("backend_registration");
        }
      }

      await persistToken();

      tokenSubscription = Notifications.addPushTokenListener(() => {
        void persistToken().catch(() => {
          reportPushRegistrationFailure("token_refresh");
        });
      });
    }

    void register().catch(() => {
      reportPushRegistrationFailure("setup");
    });

    return () => {
      cancelled = true;

      tokenSubscription?.remove();
    };
  }, [isAuthenticated, isLoading, primer, registerDevice]);

  return (
    <NotificationPrimer
      visible={primer === "ask"}
      onEnable={() => setPrimer("go")}
      onLater={() => {
        setPrimer("skip");
        void SecureStore.setItemAsync(PRIMER_KEY, String(Date.now())).catch(
          () => {},
        );
      }}
    />
  );
}
