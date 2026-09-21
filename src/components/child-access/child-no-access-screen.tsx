import {
  getLocalChildContextByStoragePrefix,
  removeLocalChildContext,
} from "@/lib/child-access/local-access";
import { forgetLocalChildGrant } from "@/lib/child-access/grant-status";
import { setChildExplicitlyLocked } from "@/lib/child-access/unlock-policy";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { AppImage as Image } from "@/components/ui/app-image";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText } from "@/design-system";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { ChildJoinScreen } from "./child-join-screen";

const recoveryArtwork = require("../../../assets/images/direction-c/child-access-recovery.png");

type CleanupState = "checking" | "join" | "cleaning" | "error";

export function ChildNoAccessScreen({
  visualState,
}: {
  visualState?: Extract<CleanupState, "error">;
} = {}) {
  const { authClient, storagePrefix, activateParentStorage } = useAuthRuntime();

  const [cleanupState, setCleanupState] = useState<CleanupState>(
    visualState ?? "checking",
  );

  const [cleanupAttempt, setCleanupAttempt] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visualState) return;

    let cancelled = false;

    async function reconcileAccess() {
      setCleanupState("checking");

      setErrorMessage(null);

      try {
        const localContext =
          await getLocalChildContextByStoragePrefix(storagePrefix);

        if (cancelled) {
          return;
        }

        /*
         * Fresh anonymous Child session:
         * nothing has been paired locally yet.
         */
        if (!localContext) {
          setCleanupState("join");

          return;
        }

        /*
         * A saved Child context exists, but
         * Convex says the active device grant
         * is gone or revoked.
         */
        setCleanupState("cleaning");

        const signOutResult = await authClient.signOut();

        if (signOutResult.error) {
          throw new Error(
            signOutResult.error.message ??
              "Could not clear revoked Child session.",
          );
        }

        await removeLocalChildContext(localContext.contextId);

        await forgetLocalChildGrant(localContext.contextId);

        await setChildExplicitlyLocked(localContext.childId, false);

        if (cancelled) {
          return;
        }

        activateParentStorage();
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCleanupState("error");

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not remove revoked Child access.",
        );
      }
    }

    void reconcileAccess();

    return () => {
      cancelled = true;
    };
  }, [
    authClient,
    storagePrefix,
    activateParentStorage,
    cleanupAttempt,
    visualState,
  ]);

  if (cleanupState === "join") {
    return <ChildJoinScreen />;
  }

  if (cleanupState === "error") {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-5">
        <Image
          source={recoveryArtwork}
          className="h-56 w-64"
          contentFit="contain"
          accessible={false}
        />
        <AppText
          variant="label"
          color="urgency"
          className="mt-7 uppercase tracking-widest"
        >
          Access update
        </AppText>
        <AppText variant="display" className="mt-3 text-center">
          Could not clear Child access
        </AppText>
        <AppText color="ink-muted" className="mt-4 text-center">
          This device couldn’t finish removing the revoked Child profile. No
          Child access is available until cleanup succeeds.
        </AppText>
        {errorMessage ? (
          <AppText
            variant="caption"
            color="urgency"
            className="mt-3 text-center"
          >
            {errorMessage}
          </AppText>
        ) : null}
        <ActionButton
          className="mt-8 w-full"
          label="Retry cleanup"
          onPress={() => setCleanupAttempt((current) => current + 1)}
        />
        <AppText
          variant="bodySmall"
          color="ink-muted"
          className="mt-6 text-center"
        >
          Keep this app open while access is updated.
        </AppText>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-canvas px-6">
      <StatusBar style="dark" />
      <View className="h-16 w-16 items-center justify-center rounded-full bg-actionSoft">
        <ActivityIndicator color={DirectionC.color.green} />
      </View>

      <AppText variant="sectionTitle" className="mt-4 text-center">
        Getting access ready
      </AppText>
      <AppText color="ink-muted" className="mt-1 text-center">
        {cleanupState === "cleaning"
          ? "Removing revoked Child access…"
          : "Checking Child access…"}
      </AppText>
    </View>
  );
}
