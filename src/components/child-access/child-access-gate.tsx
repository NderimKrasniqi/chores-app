import {
  getLocalChildContextByStoragePrefix,
  type LocalChildContext,
} from '@/lib/child-local-access';
import { useAuthRuntime } from '@/providers/auth-runtime-provider';
import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Text,
  View,
} from 'react-native';

import type { Id } from '../../../convex/_generated/dataModel';

import { ChildHomeScreen } from './child-home-screen';
import { ChildPinSetupScreen } from './child-pin-setup-screen';
import { ChildPinUnlockScreen } from './child-pin-unlock-screen';

type ChildAccess = {
  accessGrantId: Id<'childDeviceAccessGrants'>;

  householdId: Id<'households'>;
  householdName: string;

  childId: Id<'children'>;
  childDisplayName: string;

  grantedAt: number;
};

type ChildAccessGateProps = {
  access: ChildAccess;
};

export function ChildAccessGate({
  access,
}: ChildAccessGateProps) {
  const {
    storagePrefix,
  } = useAuthRuntime();

  const [
    localContext,
    setLocalContext,
  ] =
    useState<LocalChildContext | null>(
      null,
    );

  /*
   * Unlock state deliberately lives only in React
   * memory.
   *
   * It is not persisted. Restarting/remounting the
   * app requires the PIN again.
   */
  const [
    unlocked,
    setUnlocked,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLocalContext() {
      setLoading(true);
      setUnlocked(false);
      setErrorMessage(null);

      try {
        const context =
          await getLocalChildContextByStoragePrefix(
            storagePrefix,
          );

        if (cancelled) {
          return;
        }

        if (
          context &&
          context.childId !==
            access.childId
        ) {
          setErrorMessage(
            'This local auth context belongs to a different child profile.',
          );

          setLocalContext(null);

          return;
        }

        setLocalContext(context);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not load local child access.',
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
  }, [
    access.childId,
    storagePrefix,
  ]);

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-950">
        <ActivityIndicator />

        <Text className="mt-3 text-slate-400">
          Loading child profile...
        </Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="justify-center flex-1 px-6 bg-slate-950">
        <Text className="text-xl font-bold text-white">
          Child profile error
        </Text>

        <Text className="mt-3 leading-6 text-red-400">
          {errorMessage}
        </Text>
      </View>
    );
  }

  /*
   * Server grant exists, but this local Child
   * has never had a PIN configured.
   */
  if (!localContext) {
    return (
      <ChildPinSetupScreen
        householdId={
          access.householdId
        }
        householdName={
          access.householdName
        }
        childId={
          access.childId
        }
        childDisplayName={
          access.childDisplayName
        }
        authStoragePrefix={
          storagePrefix
        }
        onComplete={(context) => {
          setLocalContext(
            context,
          );

          /*
           * The person just proved possession by
           * creating/confirming the PIN, so this
           * in-memory session can open immediately.
           */
          setUnlocked(true);
        }}
      />
    );
  }

  /*
   * Existing stored Child profiles must prove the
   * local PIN before the Child UI is rendered.
   */
  if (!unlocked) {
    return (
      <ChildPinUnlockScreen
        context={
          localContext
        }
        onUnlocked={() =>
          setUnlocked(true)
        }
      />
    );
  }

  return (
    <ChildHomeScreen
      access={access}
    />
  );
}
