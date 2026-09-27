import {
  createChildAuthStoragePrefix,
  listLocalChildContexts,
  removeLocalChildContext,
  type LocalChildContext,
} from "@/lib/child-access/local-access";
import {
  forgetLocalChildGrant,
  listLocalChildGrantBindings,
  type LocalChildGrantBinding,
} from "@/lib/child-access/grant-status";
import {
  isChildExplicitlyLocked,
  markTrustedSingleChildAutoOpen,
  setChildExplicitlyLocked,
} from "@/lib/child-access/unlock-policy";
import { Icon } from "@/components/ui/icon";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { Scene, StarBuddy, Starfield } from "@/components/art";
import {
  ActionButton,
  AppText,
  Surface,
  ThemeScope,
  questTokens as tokens,
} from "@/design-system";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { useQuery } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { userErrorMessage } from "@/lib/errors";

import { api } from "../../../convex/_generated/api";

type EntryChoiceScreenProps = {
  onChooseParent: () => void;
};

/*
 * Only one automatic single-Child open
 * per JavaScript app session.
 *
 * A cold app restart resets this.
 *
 * A live revocation sets this to true so
 * removing one Child never automatically
 * opens another Child in the same session.
 */
let automaticallyOpenedSingleChild = false;

export function EntryChoiceScreen({ onChooseParent }: EntryChoiceScreenProps) {
  const { activateParentStorage, activateStoragePrefix } = useAuthRuntime();

  const [localChildContexts, setLocalChildContexts] = useState<
    LocalChildContext[]
  >([]);

  const [grantBindings, setGrantBindings] = useState<LocalChildGrantBinding[]>(
    [],
  );

  const [loadingContexts, setLoadingContexts] = useState(true);

  const [cleaningRevokedProfiles, setCleaningRevokedProfiles] = useState(false);

  const [switchingContextId, setSwitchingContextId] = useState<string | null>(
    null,
  );

  const [startingChildSession, setStartingChildSession] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /*
   * Live Convex subscription for the
   * opaque device-grant IDs already known
   * to this physical device.
   */
  const grantStatuses = useQuery(
    api.childAccess.getLocalGrantStatuses,

    grantBindings.length > 0
      ? {
          accessGrantIds: grantBindings.map((binding) => binding.accessGrantId),
        }
      : "skip",
  );

  /*
   * Derive revocation directly from the
   * latest Convex result.
   *
   * As soon as Convex reports a revoked
   * grant, the chooser is hidden before
   * cleanup begins.
   */
  const detectedRevokedGrantIds = useMemo(
    () =>
      new Set(
        grantStatuses
          ?.filter((status) => !status.isActive)
          .map((status) => status.accessGrantId) ?? [],
      ),
    [grantStatuses],
  );

  const hasDetectedRevocation = detectedRevokedGrantIds.size > 0;

  const updatingAccess = hasDetectedRevocation || cleaningRevokedProfiles;

  /*
   * Read saved Child profiles and their
   * local grant bindings from SecureStore.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadContexts() {
      setLoadingContexts(true);

      setErrorMessage(null);

      try {
        const [contexts, bindings] = await Promise.all([
          listLocalChildContexts(),
          listLocalChildGrantBindings(),
        ]);

        if (cancelled) {
          return;
        }

        const contextIds = new Set(
          contexts.map((context) => context.contextId),
        );

        const validBindings = bindings.filter((binding) =>
          contextIds.has(binding.contextId),
        );

        const staleBindings = bindings.filter(
          (binding) => !contextIds.has(binding.contextId),
        );

        for (const binding of staleBindings) {
          await forgetLocalChildGrant(binding.contextId);
        }

        if (cancelled) {
          return;
        }

        setLocalChildContexts(contexts);

        setGrantBindings(validBindings);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          userErrorMessage(error, "Could not load saved child profiles."),
        );
      } finally {
        if (!cancelled) {
          setLoadingContexts(false);
        }
      }
    }

    void loadContexts();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Remove locally saved profiles when
   * Convex reports that their device grant
   * was revoked.
   *
   * IMPORTANT:
   *
   * cleaningRevokedProfiles is deliberately
   * NOT a dependency of this effect.
   *
   * The previous version depended on it and
   * also set it to true inside this effect.
   * That cancelled the active async cleanup
   * before its finally block could reset the
   * state, leaving "Updating access..." stuck.
   */
  useEffect(() => {
    if (grantStatuses === undefined) {
      return;
    }

    const revokedGrantIds = new Set(
      grantStatuses
        .filter((status) => !status.isActive)
        .map((status) => status.accessGrantId),
    );

    const revokedBindings = grantBindings.filter((binding) =>
      revokedGrantIds.has(binding.accessGrantId),
    );

    if (revokedBindings.length === 0) {
      return;
    }

    /*
     * Do not automatically enter another
     * Child profile after revocation.
     */
    automaticallyOpenedSingleChild = true;

    let cancelled = false;

    async function removeRevokedProfiles() {
      setCleaningRevokedProfiles(true);

      try {
        const revokedContextIds = new Set(
          revokedBindings.map((binding) => binding.contextId),
        );

        const revokedContexts = localChildContexts.filter((context) =>
          revokedContextIds.has(context.contextId),
        );

        for (const context of revokedContexts) {
          await removeLocalChildContext(context.contextId);

          await forgetLocalChildGrant(context.contextId);

          await setChildExplicitlyLocked(context.childId, false);
        }

        /*
         * Defensive sidecar cleanup if a
         * local context disappeared before
         * its binding did.
         */
        for (const binding of revokedBindings) {
          if (
            !revokedContexts.some(
              (context) => context.contextId === binding.contextId,
            )
          ) {
            await forgetLocalChildGrant(binding.contextId);
          }
        }

        if (cancelled) {
          return;
        }

        setLocalChildContexts((current) =>
          current.filter(
            (context) => !revokedContextIds.has(context.contextId),
          ),
        );

        setGrantBindings((current) =>
          current.filter(
            (binding) => !revokedContextIds.has(binding.contextId),
          ),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          userErrorMessage(error, "Could not remove revoked Child profile."),
        );
      } finally {
        /*
         * This cleanup is no longer triggered
         * merely by setting this state true,
         * so the finally block can actually
         * clear the spinner.
         */
        if (!cancelled) {
          setCleaningRevokedProfiles(false);
        }
      }
    }

    void removeRevokedProfiles();

    return () => {
      cancelled = true;
    };
  }, [grantBindings, grantStatuses, localChildContexts]);

  /*
   * Fresh app launch with exactly one
   * locally saved Child.
   *
   * If that Child already has a grant
   * binding, wait until Convex has checked
   * that grant before automatically
   * opening the profile.
   *
   * We do NOT show a blocking spinner while
   * waiting. The chooser can remain visible.
   */
  useEffect(() => {
    if (
      loadingContexts ||
      updatingAccess ||
      localChildContexts.length !== 1 ||
      automaticallyOpenedSingleChild
    ) {
      return;
    }

    const onlyChild = localChildContexts[0];

    const onlyChildBinding = grantBindings.find(
      (binding) => binding.contextId === onlyChild.contextId,
    );

    /*
     * Existing migrated profile:
     * wait for Convex to confirm the known
     * grant before auto-opening it.
     */
    if (onlyChildBinding && grantStatuses === undefined) {
      return;
    }

    /*
     * If Convex has already identified
     * revocation, cleanup owns the flow.
     */
    if (
      onlyChildBinding &&
      detectedRevokedGrantIds.has(onlyChildBinding.accessGrantId)
    ) {
      return;
    }

    let cancelled = false;

    async function autoOpenSingleChild() {
      automaticallyOpenedSingleChild = true;

      try {
        const explicitlyLocked = await isChildExplicitlyLocked(
          onlyChild.childId,
        );

        if (cancelled) {
          return;
        }

        if (!explicitlyLocked) {
          markTrustedSingleChildAutoOpen(onlyChild.authStoragePrefix);
        }

        setSwitchingContextId(onlyChild.contextId);

        activateStoragePrefix(onlyChild.authStoragePrefix);
      } catch (error) {
        if (cancelled) {
          return;
        }

        automaticallyOpenedSingleChild = false;

        setSwitchingContextId(null);

        setErrorMessage(
          userErrorMessage(error, "Could not open child profile."),
        );
      }
    }

    void autoOpenSingleChild();

    return () => {
      cancelled = true;
    };
  }, [
    activateStoragePrefix,
    detectedRevokedGrantIds,
    grantBindings,
    grantStatuses,
    loadingContexts,
    localChildContexts,
    updatingAccess,
  ]);

  function handleChooseParent() {
    setErrorMessage(null);

    activateParentStorage();

    onChooseParent();
  }

  function handleChooseSavedChild(context: LocalChildContext) {
    setErrorMessage(null);

    setSwitchingContextId(context.contextId);

    try {
      activateStoragePrefix(context.authStoragePrefix);
    } catch (error) {
      setSwitchingContextId(null);

      setErrorMessage(userErrorMessage(error, "Could not open child profile."));
    }
  }

  async function handleAddChild() {
    setStartingChildSession(true);

    setErrorMessage(null);

    try {
      const childStoragePrefix = createChildAuthStoragePrefix();

      const childAuthClient = activateStoragePrefix(childStoragePrefix);

      const result = await childAuthClient.signIn.anonymous();

      if (result.error) {
        activateParentStorage();

        setErrorMessage(
          result.error.message ?? "Could not start child session.",
        );
      }
    } catch (error) {
      activateParentStorage();

      setErrorMessage(
        userErrorMessage(error, "Could not start child session."),
      );
    } finally {
      setStartingChildSession(false);
    }
  }

  /*
   * Only actual loading, actual revocation
   * cleanup, or an active profile switch
   * gets a full-screen spinner.
   */
  if (loadingContexts || updatingAccess || switchingContextId !== null) {
    if (switchingContextId !== null) {
      return (
        <OpeningProfile
          key={switchingContextId}
          onBack={() => {
            activateParentStorage();
            setSwitchingContextId(null);
          }}
        />
      );
    }

    let message = "Loading profiles…";

    if (updatingAccess) {
      message = "Updating access…";
    }

    if (switchingContextId !== null) {
      message = "Opening child profile…";
    }

    return (
      <ThemeScope mode="quest">
        <View className="flex-1 items-center justify-center bg-canvas px-6">
          <StatusBar style="light" />
          <Starfield seed={31} />
          <StarBuddy size={84} mood="hop" />
          <AppText variant="sectionTitle" className="mt-6 text-center">
            Getting things ready
          </AppText>
          <AppText
            color="ink-muted"
            className="mt-1 text-center font-body-bold"
          >
            {message}
          </AppText>
        </View>
      </ThemeScope>
    );
  }

  return (
    <ThemeScope mode="quest">
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
        <StatusBar style="light" />
        <Starfield seed={5} />
        <ScrollView
          contentContainerClassName="flex-grow px-5 pb-6 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center pt-4">
            <View className="items-center justify-center">
              <Scene name="planet" size={190} />
              <View className="absolute" style={{ top: 58 }}>
                <StarBuddy size={70} mood="wave" />
              </View>
            </View>
            <AppText variant="screenTitle" className="mt-4 text-center">
              Who’s using this phone?
            </AppText>
            <AppText
              color="ink-muted"
              className="mt-2 text-center font-body-bold"
            >
              Pick your profile, sign in as a Parent, or pair another Child.
            </AppText>
          </View>

          {localChildContexts.length > 0 ? (
            <View className="mt-7">
              <AppText
                variant="label"
                color="ink-muted"
                className="uppercase tracking-[1.2px]"
              >
                Saved Child profiles
              </AppText>

              <View className="mt-3 gap-3">
                {localChildContexts.map((context) => (
                  <Pressable
                    key={context.contextId}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${context.childDisplayName} in ${context.householdName}`}
                    className="min-h-[84px] flex-row items-center gap-4 rounded-large bg-surface px-4 py-3"
                    onPress={() => handleChooseSavedChild(context)}
                  >
                    <Avatar
                      tone={childAvatarTone(context.childDisplayName)}
                      className="h-[58px] w-[58px]"
                      fallbackLabel={context.childDisplayName}
                    />
                    <View className="flex-1">
                      <AppText className="font-display text-[22px] leading-[26px]">
                        {context.childDisplayName}
                      </AppText>
                      <AppText variant="bodySmall" color="ink-muted">
                        {context.householdName}
                      </AppText>
                    </View>
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
                      <Icon name="chevron" color={tokens.night} size={20} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View className="mt-7 gap-3">
            <Pressable
              testID="entry-pair-child"
              accessibilityRole="button"
              accessibilityLabel="Pair another child"
              disabled={startingChildSession}
              onPress={handleAddChild}
              className="flex-row items-center gap-3.5 rounded-large border-b-[5px] border-primaryShade bg-primary p-4"
            >
              <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-night">
                <Icon name="scan" color={tokens.gold} size={26} />
              </View>
              <View className="flex-1">
                <AppText className="font-display text-[20px] text-night">
                  {startingChildSession
                    ? "Starting Child setup…"
                    : localChildContexts.length > 0
                      ? "Pair another child"
                      : "I’m a child"}
                </AppText>
                <AppText className="font-body-bold text-[14px] text-night">
                  Scan the code from a Parent
                </AppText>
              </View>
              <Icon name="chevron" color={tokens.night} size={20} />
            </Pressable>

            <Pressable
              testID="entry-continue-parent"
              accessibilityRole="button"
              accessibilityLabel="Continue as a parent"
              onPress={handleChooseParent}
              className="flex-row items-center gap-3.5 rounded-large bg-surface p-4"
            >
              <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-nightRaised">
                <Icon name="home" color={tokens.ink} size={26} />
              </View>
              <View className="flex-1">
                <AppText className="font-display text-[20px]">
                  I’m a parent
                </AppText>
                <AppText
                  variant="bodySmall"
                  color="ink-muted"
                  className="font-body-bold"
                >
                  Sign in or open the Parent account
                </AppText>
              </View>
              <Icon name="chevron" color={tokens.inkMuted} size={20} />
            </Pressable>
          </View>

          {errorMessage ? (
            <Surface tone="coral" className="mt-4 p-3">
              <AppText
                variant="bodySmall"
                color="urgency"
                className="text-center"
              >
                {errorMessage}
              </AppText>
            </Surface>
          ) : null}

          <View className="flex-1" />
          <AppText
            variant="caption"
            color="ink-muted"
            className="mt-10 text-center"
          >
            Saved profiles stay private on this device.
          </AppText>
        </ScrollView>
      </SafeAreaView>
    </ThemeScope>
  );
}

const SLOW_OPEN_MS = 10_000;

/**
 * Opening a saved child profile needs the server. If it's taking long (no
 * connection), say so and offer a way back instead of spinning forever; it
 * keeps trying in the background and opens by itself once connected.
 */
function OpeningProfile({ onBack }: { onBack: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_OPEN_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <ThemeScope mode="quest">
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="light" />
        <Starfield seed={31} />
        <StarBuddy size={84} mood={slow ? "sleepy" : "hop"} />
        <AppText variant="sectionTitle" className="mt-6 text-center">
          {slow ? "Can’t reach the server" : "Getting things ready"}
        </AppText>
        <AppText color="ink-muted" className="mt-1 text-center font-body-bold">
          {slow
            ? "Check the Wi-Fi. We’ll keep trying and open your profile as soon as we’re connected."
            : "Opening child profile…"}
        </AppText>
        {slow ? (
          <ActionButton
            className="mt-6 w-full"
            tone="quiet"
            label="Back"
            onPress={onBack}
          />
        ) : null}
      </View>
    </ThemeScope>
  );
}
