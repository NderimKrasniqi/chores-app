import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { reportPushRegistrationFailure } from "@/lib/notifications/push-observability";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useConvexAuth } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { authClient } from "@/lib/auth/client";
import { setNotificationIntent } from "@/lib/notification-intent";

import { NotificationPrimer } from "./notification-primer";

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
