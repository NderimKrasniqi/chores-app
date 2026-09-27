import {
  getLocalChildContextByStoragePrefix,
  type LocalChildContext,
} from "@/lib/child-access/local-access";
import { rememberLocalChildGrant } from "@/lib/child-access/grant-status";
import {
  consumeTrustedSingleChildAutoOpen,
  setChildExplicitlyLocked,
} from "@/lib/child-access/unlock-policy";
import { LostSatellite, StarBuddy, Starfield } from "@/components/art";
import { AppText } from "@/design-system";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { userErrorMessage } from "@/lib/errors";

import type { Id } from "../../../convex/_generated/dataModel";

import { ChildHomeScreen } from "./child-home-screen";
import { ChildPinSetupScreen } from "./child-pin-setup-screen";
import { ChildPinUnlockScreen } from "./child-pin-unlock-screen";

type ChildAccess = {
  accessGrantId: Id<"childDeviceAccessGrants">;

  householdId: Id<"households">;

  householdName: string;

  childId: Id<"children">;

  childDisplayName: string;

  grantedAt: number;
};

type ChildAccessGateProps = {
  access: ChildAccess;
};

export function ChildAccessGate({ access }: ChildAccessGateProps) {
  const { storagePrefix } = useAuthRuntime();

  const [localContext, setLocalContext] = useState<LocalChildContext | null>(
    null,
  );

  const [unlocked, setUnlocked] = useState(false);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const trustedSingleChildOpen =
      consumeTrustedSingleChildAutoOpen(storagePrefix);

    async function loadLocalContext() {
      setLoading(true);

      setUnlocked(false);

      setErrorMessage(null);

      try {
        const context =
          await getLocalChildContextByStoragePrefix(storagePrefix);

        if (cancelled) {
          return;
        }

        if (context && context.childId !== access.childId) {
          setErrorMessage(
            "This local auth context belongs to a different child profile.",
          );

          setLocalContext(null);

          return;
        }

        if (context) {
          /*
           * Bind this saved local context to the
           * exact server-side device grant.
           *
           * Existing TASK-05 profiles get migrated
           * automatically the next time they are
           * successfully opened.
           */
          await rememberLocalChildGrant(
            context.contextId,
            access.accessGrantId,
          );

          if (cancelled) {
            return;
          }
        }

        setLocalContext(context);

        if (context && trustedSingleChildOpen) {
          setUnlocked(true);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          userErrorMessage(error, "Could not load local child access."),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLocalContext();

    return () => {
      cancelled = true;
    };
  }, [access.accessGrantId, access.childId, storagePrefix]);

  async function handlePinUnlocked() {
    if (!localContext) {
      return;
    }

    try {
      await setChildExplicitlyLocked(localContext.childId, false);

      setUnlocked(true);
    } catch (error) {
      setErrorMessage(
        userErrorMessage(error, "Could not unlock child profile."),
      );
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="light" />
        <Starfield seed={access.childDisplayName.length + 11} />
        <StarBuddy size={84} mood="hop" />
        <AppText variant="sectionTitle" className="mt-6 text-center">
          Getting your quests ready
        </AppText>
        <AppText color="ink-muted" className="mt-1 text-center font-body-bold">
          Hang on, {access.childDisplayName}!
        </AppText>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="light" />
        <Starfield seed={7} />
        <LostSatellite size={180} />
        <AppText variant="sectionTitle" className="mt-6 text-center">
          We couldn’t open your profile
        </AppText>
        <AppText color="ink-muted" className="mt-2 text-center font-body-bold">
          {errorMessage}
        </AppText>
        <AppText color="ink-muted" className="mt-4 text-center">
          Close the app and open it again. If it keeps happening, ask a Parent.
        </AppText>
      </View>
    );
  }

  if (!localContext) {
    return (
      <ChildPinSetupScreen
        householdId={access.householdId}
        householdName={access.householdName}
        childId={access.childId}
        childDisplayName={access.childDisplayName}
        authStoragePrefix={storagePrefix}
        onComplete={(context) => {
          void rememberLocalChildGrant(context.contextId, access.accessGrantId);

          setLocalContext(context);

          setUnlocked(true);
        }}
      />
    );
  }

  if (!unlocked) {
    return (
      <ChildPinUnlockScreen
        context={localContext}
        onUnlocked={() => {
          void handlePinUnlocked();
        }}
      />
    );
  }

  return <ChildHomeScreen access={access} />;
}
