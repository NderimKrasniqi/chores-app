import {
  createChildAuthStoragePrefix,
  listLocalChildContexts,
  type LocalChildContext,
} from '@/lib/child-local-access';
import { useAuthRuntime } from '@/providers/auth-runtime-provider';
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

type EntryChoiceScreenProps = {
  onChooseParent: () => void;
};

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
  ] = useState<LocalChildContext[]>([]);

  const [
    loadingContexts,
    setLoadingContexts,
  ] = useState(true);

  const [
    switchingContextId,
    setSwitchingContextId,
  ] = useState<string | null>(null);

  const [
    startingChildSession,
    setStartingChildSession,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContexts() {
      setLoadingContexts(true);
      setErrorMessage(null);

      try {
        const contexts =
          await listLocalChildContexts();

        if (!cancelled) {
          setLocalChildContexts(
            contexts,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Could not load saved child profiles.',
          );
        }
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

  function handleChooseParent() {
    setErrorMessage(null);

    activateParentStorage();

    onChooseParent();
  }

  function handleChooseSavedChild(
    context: LocalChildContext,
  ) {
    setErrorMessage(null);

    setSwitchingContextId(
      context.contextId,
    );

    try {
      /*
       * Switch Better Auth + Convex to this
       * Child's isolated SecureStore session.
       *
       * The provider subtree remounts after the
       * storage prefix changes. If that session
       * still has an active Convex device grant,
       * ChildAccessGate will require the PIN.
       */
      activateStoragePrefix(
        context.authStoragePrefix,
      );
    } catch (error) {
      setSwitchingContextId(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not open child profile.',
      );
    }
  }

  async function handleAddChild() {
    setStartingChildSession(true);
    setErrorMessage(null);

    try {
      const childStoragePrefix =
        createChildAuthStoragePrefix();

      const childAuthClient =
        activateStoragePrefix(
          childStoragePrefix,
        );

      const result =
        await childAuthClient.signIn.anonymous();

      if (result.error) {
        activateParentStorage();

        setErrorMessage(
          result.error.message ??
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
      setStartingChildSession(false);
    }
  }

  return (
    <View className="justify-center flex-1 px-6 bg-slate-950">
      <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
        Chores App
      </Text>

      <Text className="mt-3 text-4xl font-bold text-white">
        Who&apos;s using this device?
      </Text>

      <Text className="mt-3 text-base leading-6 text-slate-400">
        Choose a saved child profile, sign in
        as a parent, or pair another child.
      </Text>

      {loadingContexts ? (
        <View className="items-center py-8">
          <ActivityIndicator />

          <Text className="mt-3 text-sm text-slate-500">
            Loading saved profiles...
          </Text>
        </View>
      ) : (
        localChildContexts.length > 0 && (
          <View className="mt-8">
            <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
              Saved child profiles
            </Text>

            {localChildContexts.map(
              (context) => (
                <Pressable
                  key={context.contextId}
                  className="px-5 py-5 mt-3 border rounded-2xl border-slate-700 bg-slate-900"
                  disabled={
                    switchingContextId !== null
                  }
                  onPress={() =>
                    handleChooseSavedChild(
                      context,
                    )
                  }
                >
                  <Text className="text-lg font-semibold text-white">
                    {context.childDisplayName}
                  </Text>

                  <Text className="mt-1 text-sm text-slate-400">
                    {context.householdName}
                  </Text>

                  {switchingContextId ===
                    context.contextId && (
                    <Text className="mt-2 text-sm text-slate-500">
                      Opening profile...
                    </Text>
                  )}
                </Pressable>
              ),
            )}
          </View>
        )
      )}

      <Pressable
        className="px-5 py-5 mt-8 bg-white rounded-2xl"
        onPress={handleChooseParent}
      >
        <Text className="text-lg font-semibold text-center text-slate-950">
          I&apos;m a parent
        </Text>

        <Text className="mt-1 text-sm text-center text-slate-600">
          Sign in or open the Parent account
        </Text>
      </Pressable>

      <Pressable
        className="px-5 py-5 mt-4 border rounded-2xl border-slate-700 bg-slate-900"
        disabled={startingChildSession}
        onPress={handleAddChild}
      >
        <Text className="text-lg font-semibold text-center text-white">
          {startingChildSession
            ? 'Starting child setup...'
            : 'Add another child'}
        </Text>

        <Text className="mt-1 text-sm text-center text-slate-400">
          Pair another child profile to this device
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
