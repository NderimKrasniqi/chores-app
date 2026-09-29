import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { reportPushRegistrationFailure } from "@/lib/notifications/push-observability";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useConvexAuth } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { useLoop } from "@/components/art";
import { Easings } from "@/components/art/motion";
import { authClient } from "@/lib/auth/client";
import { ActionButton, AppText, ScrimSheet } from "@/design-system";
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
          // So a JS reload doesn't navigate there again.
          void Notifications.clearLastNotificationResponseAsync?.().catch(
            () => {},
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

/**
 * A ringing bell with sound waves, and a little notification that drops in
 * above it — a preview of what the heads-up will look like.
 */
function Bell({ audience }: { audience: "child" | "parent" }) {
  const { tokens } = useTheme();
  const ring = useLoop({ duration: 1400, reverse: true, rest: 0.5 });
  const wave = useLoop({ duration: 1800, easing: Easings.linear, rest: 0.4 });
  const drop = useLoop({ duration: 3600, easing: Easings.out, rest: 1 });

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(ring.get(), [0, 1], [-12, 12])}deg` }],
  }));
  const waveStyle = (offset: number) => {
    "worklet";
    const t = (wave.get() + offset) % 1;
    return {
      opacity: interpolate(t, [0, 0.2, 1], [0, 0.8, 0]),
      transform: [{ scale: 0.8 + t * 0.9 }],
    };
  };
  const waveA = useAnimatedStyle(() => waveStyle(0));
  const waveB = useAnimatedStyle(() => waveStyle(0.5));
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drop.get(), [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(drop.get(), [0, 0.15, 1], [-18, 0, 0]) },
      { scale: interpolate(drop.get(), [0, 0.15], [0.95, 1], "clamp") },
    ],
  }));

  const title =
    audience === "child" ? "Clean your room" : "Alex sent Feed the dog";
  const detail = audience === "child" ? "Approved! +30 kr" : "Tap to check it";

  return (
    <View accessible={false} style={{ alignItems: "center", height: 170 }}>
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 18,
            backgroundColor: tokens.surface,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          },
          bannerStyle,
        ]}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: tokens.reward,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z"
              fill={tokens.ink}
            />
          </Svg>
        </View>
        <View>
          <AppText variant="label">{title}</AppText>
          <AppText variant="caption" color="ink-muted">
            {detail}
          </AppText>
        </View>
      </Animated.View>

      <View
        style={{
          marginTop: 12,
          width: 96,
          height: 96,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[waveA, waveB].map((style, i) => (
          <Animated.View
            key={i}
            style={[
              {
                position: "absolute",
                width: 92,
                height: 92,
                borderRadius: 46,
                borderWidth: 3,
                borderColor: tokens.reward,
              },
              style,
            ]}
          />
        ))}
        <Animated.View style={[{ transformOrigin: "center top" }, bellStyle]}>
          <Svg width={80} height={80} viewBox="0 0 96 96">
            <Path
              d="M48 14c-15 0-26 11-26 27v17l-7 11h66l-7-11V41c0-16-11-27-26-27z"
              fill={tokens.reward}
              stroke={tokens.ink}
              strokeWidth={4}
              strokeLinejoin="round"
            />
            <Circle
              cx={48}
              cy={78}
              r={8}
              fill={tokens.reward}
              stroke={tokens.ink}
              strokeWidth={4}
            />
            <Circle cx={72} cy={24} r={11} fill={tokens.urgency} />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * Explains notifications before the one-time system prompt, so it isn't a
 * cold pop-up in the middle of setup. "Not now" asks again after a week.
 */
export function NotificationPrimer({
  visible,
  audience,
  onEnable,
  onLater,
}: {
  visible: boolean;
  audience: "child" | "parent";
  onEnable: () => void;
  onLater: () => void;
}) {
  return (
    <ScrimSheet
      visible={visible}
      onClose={onLater}
      className="rounded-t-sheet bg-canvas px-6 pt-3"
      grabberClassName="bg-line"
      extraBottom={16}
    >
      <View className="mt-2" />
      <Bell audience={audience} />
      <AppText variant="sectionTitle" className="mt-2 text-center">
        Want a heads-up?
      </AppText>
      <AppText color="ink-muted" className="mt-2 text-center">
        {audience === "child"
          ? "We’ll tell you when a Parent approves your work or asks for a redo, when a deadline is close, and when new Extras appear."
          : "We’ll tell you when there’s work to check, and when an Extra is claimed or missed."}
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
    </ScrimSheet>
  );
}

export function PushRegistrationBridge() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { data: session } = authClient.useSession();
  const audience =
    session?.user && "isAnonymous" in session.user && session.user.isAnonymous
      ? "child"
      : "parent";
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
      audience={audience}
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
