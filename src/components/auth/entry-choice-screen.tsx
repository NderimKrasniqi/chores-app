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
import {
  childAvatarTone,
  Avatar,
} from "@/components/ui/avatar";
import { homeTokens as themeColors } from "@/design-system/theme";
import { AppText, DesignTokens, Surface } from "@/design-system";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { useQuery } from "convex/react";
import { AppImage as Image } from "@/components/ui/app-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";

const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");
const chooserHero = require("../../../assets/images/direction-c/household-home.png");

function childAvatar(displayName: string) {
  const normalized = displayName.trim().toLowerCase();
  if (normalized === "maya") return mayaAvatar;
  if (normalized === "alex") return alexAvatar;
  return null;
}

type EntryChoiceScreenProps = {
  onChooseParent: () => void;
};

const styles = StyleSheet.create({
  parentChoice: {
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  childChoice: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
});

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
          error instanceof Error
            ? error.message
            : "Could not load saved child profiles.",
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
          error instanceof Error
            ? error.message
            : "Could not remove revoked Child profile.",
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
          error instanceof Error
            ? error.message
            : "Could not open child profile.",
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

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not open child profile.",
      );
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
        error instanceof Error
          ? error.message
          : "Could not start child session.",
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
    let message = "Loading profiles…";

    if (updatingAccess) {
      message = "Updating access…";
    }

    if (switchingContextId !== null) {
      message = "Opening child profile…";
    }

    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="dark" />
        <View className="h-16 w-16 items-center justify-center rounded-full bg-actionSoft">
          <ActivityIndicator color={themeColors.action} />
        </View>
        <AppText variant="sectionTitle" className="mt-4 text-center">
          Getting things ready
        </AppText>
        <AppText color="ink-muted" className="mt-1 text-center">
          {message}
        </AppText>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="flex-grow px-5 pb-6 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="min-h-[214px]">
          <View className="flex-row items-start">
            <View className="min-w-0 flex-1">
              <AppText
                variant="label"
                color="ink-faint"
                className="uppercase tracking-widest"
              >
                Chores App
              </AppText>
              <AppText
                variant="display"
                className="mt-2 text-[34px] leading-[40px]"
              >
                Who’s using this device?
              </AppText>
            </View>
            <Image
              source={chooserHero}
              className="h-36 w-36"
              contentFit="contain"
              accessible={false}
            />
          </View>
          <AppText className="mt-2 text-[14px] leading-[21px]">
            Choose a saved Child profile, sign in as a Parent, or pair another
            Child.
          </AppText>
        </View>

        {localChildContexts.length > 0 ? (
          <View className="mt-2">
            <AppText
              variant="label"
              color="ink-faint"
              className="uppercase tracking-widest"
            >
              Saved Child profiles
            </AppText>

            {localChildContexts.map((context) => (
              <Pressable
                key={context.contextId}
                accessibilityRole="button"
                accessibilityLabel={`Open ${context.childDisplayName} in ${context.householdName}`}
                className="-mx-[6px] mt-3 min-h-[116px] flex-row items-center rounded-large bg-surface px-3 py-2"
                style={DesignTokens.shadowStyle.card}
                onPress={() => handleChooseSavedChild(context)}
              >
                <Avatar
                  source={childAvatar(context.childDisplayName)}
                  tone={childAvatarTone(context.childDisplayName)}
                  className="h-[100px] w-[100px]"
                  fallbackLabel={context.childDisplayName}
                />
                <View className="ml-7 flex-1">
                  <AppText
                    variant="sectionTitle"
                    className="text-[30px] leading-[34px]"
                  >
                    {context.childDisplayName}
                  </AppText>
                  <AppText
                    color="ink-muted"
                    className="text-[16px] leading-[22px]"
                  >
                    {context.householdName}
                  </AppText>
                </View>
                <Icon
                  name="chevron"
                  color={themeColors.ink}
                  size={24}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable
          testID="entry-continue-parent"
          accessibilityRole="button"
          accessibilityLabel="Continue as a parent"
          className="-mx-[6px] mt-6 overflow-hidden rounded-large"
          onPress={handleChooseParent}
        >
          <LinearGradient
            colors={["#D5F4E1", "#D8F5E3"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.parentChoice}
          >
            <View className="h-[68px] w-[68px] items-center justify-center rounded-full bg-[#E5F8EF]">
              <Icon
                name="person"
                color={themeColors.actionPressed}
                size={36}
              />
            </View>
            <View className="ml-4 flex-1">
              <AppText variant="cardTitle">I’m a parent</AppText>
              <AppText
                variant="bodySmall"
                color="ink-muted"
                className="mt-1 text-[13px] leading-[18px]"
              >
                Sign in or open the Parent account.
              </AppText>
            </View>
            <Icon
              name="chevron"
              color={themeColors.ink}
              size={24}
            />
          </LinearGradient>
        </Pressable>

        <Pressable
          testID="entry-pair-child"
          accessibilityRole="button"
          accessibilityLabel="Pair another child"
          className="-mx-[6px] mt-4 overflow-hidden rounded-large border-2 border-infoSoftStrong"
          disabled={startingChildSession}
          onPress={handleAddChild}
        >
          <LinearGradient
            colors={["#F8F4FF", "#FFFDF9"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.childChoice}
          >
            <View className="h-16 w-16 items-center justify-center rounded-full bg-infoSoft">
              <Icon
                name="devices"
                color={themeColors.ink}
                size={36}
              />
            </View>
            <View className="ml-6 flex-1">
              <AppText variant="cardTitle">
                {startingChildSession
                  ? "Starting Child setup…"
                  : "Pair another child"}
              </AppText>
              <AppText
                variant="bodySmall"
                color="ink-muted"
                className="mt-1 text-[12px] leading-4"
              >
                Add another Child profile to this device
              </AppText>
            </View>
            <Icon
              name="chevron"
              color={themeColors.ink}
              size={24}
            />
          </LinearGradient>
        </Pressable>

        {errorMessage ? (
          <Surface tone="coral" elevated={false} className="mt-4 p-3">
            <AppText
              variant="bodySmall"
              color="urgency"
              className="text-center"
            >
              {errorMessage}
            </AppText>
          </Surface>
        ) : null}

        <AppText
          variant="caption"
          color="ink-muted"
          className="mt-10 text-center"
        >
          Saved profiles stay private on this device.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}
