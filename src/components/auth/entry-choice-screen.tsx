import {
  createChildAuthStoragePrefix,
  listLocalChildContexts,
  removeLocalChildContext,
  type LocalChildContext,
} from '@/lib/child-local-access';
import {
  forgetLocalChildGrant,
  listLocalChildGrantBindings,
  type LocalChildGrantBinding,
} from '@/lib/child-grant-status';
import {
  isChildExplicitlyLocked,
  markTrustedSingleChildAutoOpen,
  setChildExplicitlyLocked,
} from '@/lib/child-unlock-policy';
import { useAuthRuntime } from '@/providers/auth-runtime-provider';
import { useQuery } from 'convex/react';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';

type EntryChoiceScreenProps = {
  onChooseParent:
    () => void;
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
let automaticallyOpenedSingleChild =
  false;

export function EntryChoiceScreen({
  onChooseParent,
}: EntryChoiceScreenProps) {
  const {
    activateParentStorage,
    activateStoragePrefix,
  } = useAuthRuntime();

  const [
    localChildContexts,
    setLocalChildContexts,
  ] = useState<
    LocalChildContext[]
  >([]);

  const [
    grantBindings,
    setGrantBindings,
  ] = useState<
    LocalChildGrantBinding[]
  >([]);

  const [
    loadingContexts,
    setLoadingContexts,
  ] = useState(true);

  const [
    cleaningRevokedProfiles,
    setCleaningRevokedProfiles,
  ] = useState(false);

  const [
    switchingContextId,
    setSwitchingContextId,
  ] = useState<
    string | null
  >(null);

  const [
    startingChildSession,
    setStartingChildSession,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  /*
   * Live Convex subscription for the
   * opaque device-grant IDs already known
   * to this physical device.
   */
  const grantStatuses =
    useQuery(
      api.childAccess
        .getLocalGrantStatuses,

      grantBindings.length >
        0
        ? {
            accessGrantIds:
              grantBindings.map(
                (binding) =>
                  binding.accessGrantId,
              ),
          }
        : 'skip',
    );

  /*
   * Derive revocation directly from the
   * latest Convex result.
   *
   * As soon as Convex reports a revoked
   * grant, the chooser is hidden before
   * cleanup begins.
   */
  const detectedRevokedGrantIds =
    new Set(
      grantStatuses
        ?.filter(
          (status) =>
            !status.isActive,
        )
        .map(
          (status) =>
            status.accessGrantId,
        ) ?? [],
    );

  const hasDetectedRevocation =
    detectedRevokedGrantIds
      .size > 0;

  const updatingAccess =
    hasDetectedRevocation ||
    cleaningRevokedProfiles;

  /*
   * Read saved Child profiles and their
   * local grant bindings from SecureStore.
   */
  useEffect(() => {
    let cancelled =
      false;

    async function loadContexts() {
      setLoadingContexts(
        true,
      );

      setErrorMessage(
        null,
      );

      try {
        const [
          contexts,
          bindings,
        ] =
          await Promise.all([
            listLocalChildContexts(),
            listLocalChildGrantBindings(),
          ]);

        if (cancelled) {
          return;
        }

        const contextIds =
          new Set(
            contexts.map(
              (context) =>
                context.contextId,
            ),
          );

        const validBindings =
          bindings.filter(
            (binding) =>
              contextIds.has(
                binding.contextId,
              ),
          );

        const staleBindings =
          bindings.filter(
            (binding) =>
              !contextIds.has(
                binding.contextId,
              ),
          );

        for (
          const binding of
          staleBindings
        ) {
          await forgetLocalChildGrant(
            binding.contextId,
          );
        }

        if (cancelled) {
          return;
        }

        setLocalChildContexts(
          contexts,
        );

        setGrantBindings(
          validBindings,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not load saved child profiles.',
        );
      } finally {
        if (!cancelled) {
          setLoadingContexts(
            false,
          );
        }
      }
    }

    void loadContexts();

    return () => {
      cancelled =
        true;
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
    if (
      grantStatuses ===
      undefined
    ) {
      return;
    }

    const revokedGrantIds =
      new Set(
        grantStatuses
          .filter(
            (status) =>
              !status.isActive,
          )
          .map(
            (status) =>
              status.accessGrantId,
          ),
      );

    const revokedBindings =
      grantBindings.filter(
        (binding) =>
          revokedGrantIds.has(
            binding.accessGrantId,
          ),
      );

    if (
      revokedBindings.length ===
      0
    ) {
      return;
    }

    /*
     * Do not automatically enter another
     * Child profile after revocation.
     */
    automaticallyOpenedSingleChild =
      true;

    let cancelled =
      false;

    async function removeRevokedProfiles() {
      setCleaningRevokedProfiles(
        true,
      );

      try {
        const revokedContextIds =
          new Set(
            revokedBindings.map(
              (binding) =>
                binding.contextId,
            ),
          );

        const revokedContexts =
          localChildContexts.filter(
            (context) =>
              revokedContextIds.has(
                context.contextId,
              ),
          );

        for (
          const context of
          revokedContexts
        ) {
          await removeLocalChildContext(
            context.contextId,
          );

          await forgetLocalChildGrant(
            context.contextId,
          );

          await setChildExplicitlyLocked(
            context.childId,
            false,
          );
        }

        /*
         * Defensive sidecar cleanup if a
         * local context disappeared before
         * its binding did.
         */
        for (
          const binding of
          revokedBindings
        ) {
          if (
            !revokedContexts.some(
              (context) =>
                context.contextId ===
                binding.contextId,
            )
          ) {
            await forgetLocalChildGrant(
              binding.contextId,
            );
          }
        }

        if (cancelled) {
          return;
        }

        setLocalChildContexts(
          (current) =>
            current.filter(
              (context) =>
                !revokedContextIds.has(
                  context.contextId,
                ),
            ),
        );

        setGrantBindings(
          (current) =>
            current.filter(
              (binding) =>
                !revokedContextIds.has(
                  binding.contextId,
                ),
            ),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not remove revoked Child profile.',
        );
      } finally {
        /*
         * This cleanup is no longer triggered
         * merely by setting this state true,
         * so the finally block can actually
         * clear the spinner.
         */
        if (!cancelled) {
          setCleaningRevokedProfiles(
            false,
          );
        }
      }
    }

    void removeRevokedProfiles();

    return () => {
      cancelled =
        true;
    };
  }, [
    grantBindings,
    grantStatuses,
    localChildContexts,
  ]);

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
      localChildContexts.length !==
        1 ||
      automaticallyOpenedSingleChild
    ) {
      return;
    }

    const onlyChild =
      localChildContexts[0];

    const onlyChildBinding =
      grantBindings.find(
        (binding) =>
          binding.contextId ===
          onlyChild.contextId,
      );

    /*
     * Existing migrated profile:
     * wait for Convex to confirm the known
     * grant before auto-opening it.
     */
    if (
      onlyChildBinding &&
      grantStatuses ===
        undefined
    ) {
      return;
    }

    /*
     * If Convex has already identified
     * revocation, cleanup owns the flow.
     */
    if (
      onlyChildBinding &&
      detectedRevokedGrantIds.has(
        onlyChildBinding.accessGrantId,
      )
    ) {
      return;
    }

    let cancelled =
      false;

    async function autoOpenSingleChild() {
      automaticallyOpenedSingleChild =
        true;

      try {
        const explicitlyLocked =
          await isChildExplicitlyLocked(
            onlyChild.childId,
          );

        if (cancelled) {
          return;
        }

        if (
          !explicitlyLocked
        ) {
          markTrustedSingleChildAutoOpen(
            onlyChild.authStoragePrefix,
          );
        }

        setSwitchingContextId(
          onlyChild.contextId,
        );

        activateStoragePrefix(
          onlyChild.authStoragePrefix,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        automaticallyOpenedSingleChild =
          false;

        setSwitchingContextId(
          null,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not open child profile.',
        );
      }
    }

    void autoOpenSingleChild();

    return () => {
      cancelled =
        true;
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
    setErrorMessage(
      null,
    );

    activateParentStorage();

    onChooseParent();
  }

  function handleChooseSavedChild(
    context:
      LocalChildContext,
  ) {
    setErrorMessage(
      null,
    );

    setSwitchingContextId(
      context.contextId,
    );

    try {
      activateStoragePrefix(
        context.authStoragePrefix,
      );
    } catch (error) {
      setSwitchingContextId(
        null,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not open child profile.',
      );
    }
  }

  async function handleAddChild() {
    setStartingChildSession(
      true,
    );

    setErrorMessage(
      null,
    );

    try {
      const childStoragePrefix =
        createChildAuthStoragePrefix();

      const childAuthClient =
        activateStoragePrefix(
          childStoragePrefix,
        );

      const result =
        await childAuthClient
          .signIn
          .anonymous();

      if (
        result.error
      ) {
        activateParentStorage();

        setErrorMessage(
          result.error
            .message ??
            'Could not start child session.',
        );
      }
    } catch (error) {
      activateParentStorage();

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not start child session.',
      );
    } finally {
      setStartingChildSession(
        false,
      );
    }
  }

  /*
   * Only actual loading, actual revocation
   * cleanup, or an active profile switch
   * gets a full-screen spinner.
   */
  if (
    loadingContexts ||
    updatingAccess ||
    switchingContextId !==
      null
  ) {
    let message =
      'Loading profiles...';

    if (
      updatingAccess
    ) {
      message =
        'Updating access...';
    }

    if (
      switchingContextId !==
      null
    ) {
      message =
        'Opening child profile...';
    }

    return (
      <View className="items-center justify-center flex-1 px-6 bg-slate-950">
        <ActivityIndicator />

        <Text className="mt-3 text-slate-400">
          {message}
        </Text>
      </View>
    );
  }

  return (
    <View className="justify-center flex-1 px-6 bg-slate-950">
      <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
        Chores App
      </Text>

      <Text className="mt-3 text-4xl font-bold text-white">
        Who&apos;s using this
        device?
      </Text>

      <Text className="mt-3 text-base leading-6 text-slate-400">
        Choose a saved Child
        profile, sign in as a
        Parent, or pair another
        Child.
      </Text>

      {localChildContexts.length >
        0 && (
        <View className="mt-8">
          <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
            Saved child profiles
          </Text>

          {localChildContexts.map(
            (
              context,
            ) => (
              <Pressable
                key={
                  context.contextId
                }
                className="px-5 py-5 mt-3 border rounded-2xl border-slate-700 bg-slate-900"
                onPress={() =>
                  handleChooseSavedChild(
                    context,
                  )
                }
              >
                <Text className="text-lg font-semibold text-white">
                  {
                    context.childDisplayName
                  }
                </Text>

                <Text className="mt-1 text-sm text-slate-400">
                  {
                    context.householdName
                  }
                </Text>
              </Pressable>
            ),
          )}
        </View>
      )}

      <Pressable
        className="px-5 py-5 mt-8 bg-white rounded-2xl"
        onPress={
          handleChooseParent
        }
      >
        <Text className="text-lg font-semibold text-center text-slate-950">
          I&apos;m a parent
        </Text>

        <Text className="mt-1 text-sm text-center text-slate-600">
          Sign in or open the
          Parent account
        </Text>
      </Pressable>

      <Pressable
        className="px-5 py-5 mt-4 border rounded-2xl border-slate-700 bg-slate-900"
        disabled={
          startingChildSession
        }
        onPress={
          handleAddChild
        }
      >
        <Text className="text-lg font-semibold text-center text-white">
          {startingChildSession
            ? 'Starting child setup...'
            : 'Add another child'}
        </Text>

        <Text className="mt-1 text-sm text-center text-slate-400">
          Pair another Child
          profile to this device
        </Text>
      </Pressable>

      {errorMessage && (
        <Text className="mt-5 text-center text-red-400">
          {errorMessage}
        </Text>
      )}
    </View>
  );
}
