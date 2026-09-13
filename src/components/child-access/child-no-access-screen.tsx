import {
  getLocalChildContextByStoragePrefix,
  removeLocalChildContext,
} from "@/lib/child-access/local-access";
import { forgetLocalChildGrant } from "@/lib/child-access/grant-status";
import { setChildExplicitlyLocked } from "@/lib/child-access/unlock-policy";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText } from "@/design-system";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { ChildJoinScreen } from "./child-join-screen";

type CleanupState = "checking" | "join" | "cleaning" | "error";

export function ChildNoAccessScreen() {
  const { authClient, storagePrefix, activateParentStorage } = useAuthRuntime();

  const [cleanupState, setCleanupState] = useState<CleanupState>("checking");

  const [cleanupAttempt, setCleanupAttempt] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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
  }, [authClient, storagePrefix, activateParentStorage, cleanupAttempt]);

  if (cleanupState === "join") {
    return <ChildJoinScreen />;
  }

  if (cleanupState === "error") {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-5">
        <View className="h-48 w-48 items-center justify-center rounded-full bg-urgencySoft">
          <DirectionCIcon
            name="brokenLink"
            color={DirectionC.color.coral}
            size={82}
          />
        </View>
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
      <ActivityIndicator color={DirectionC.color.green} />

      <AppText color="ink-muted" className="mt-3 text-center">
        {cleanupState === "cleaning"
          ? "Removing revoked Child access…"
          : "Checking Child access…"}
      </AppText>
    </View>
  );
}
