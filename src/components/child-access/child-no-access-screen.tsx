import { LostSatellite, Starfield } from "@/components/art";
import {
  getLocalChildContextByStoragePrefix,
  removeLocalChildContext,
} from "@/lib/child-access/local-access";
import { forgetLocalChildGrant } from "@/lib/child-access/grant-status";
import { setChildExplicitlyLocked } from "@/lib/child-access/unlock-policy";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { ActionButton, AppText } from "@/design-system";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { userErrorMessage } from "@/lib/errors";

import { ChildJoinScreen } from "./child-join-screen";

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
          userErrorMessage(error, "Could not remove revoked Child access."),
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
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="light" />
        <Starfield seed={71} />
        <LostSatellite size={210} />
        <AppText
          variant="label"
          color="pink"
          className="mt-2 uppercase tracking-[1.4px]"
        >
          Lost signal
        </AppText>
        <AppText variant="screenTitle" className="mt-2 text-center">
          This device lost its link
        </AppText>
        <AppText color="ink-muted" className="mt-2 text-center font-body-bold">
          A Parent turned off this device’s access, but clearing it didn’t
          finish. Nothing opens until it does.
        </AppText>
        {errorMessage ? (
          <AppText variant="caption" color="pink" className="mt-3 text-center">
            {errorMessage}
          </AppText>
        ) : null}
        <ActionButton
          className="mt-7 w-full"
          label="Try again"
          onPress={() => setCleanupAttempt((current) => current + 1)}
        />
        <AppText
          variant="caption"
          color="ink-muted"
          className="mt-4 text-center"
        >
          Keep the app open while it finishes.
        </AppText>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-canvas px-6">
      <StatusBar style="light" />
      <Starfield seed={71} />
      <LostSatellite size={170} />
      <AppText variant="sectionTitle" className="mt-3 text-center">
        Tuning in…
      </AppText>
      <AppText color="ink-muted" className="mt-1 text-center font-body-bold">
        {cleanupState === "cleaning"
          ? "Clearing this device’s old access…"
          : "Checking this device’s access…"}
      </AppText>
    </View>
  );
}
