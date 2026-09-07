import {
  getLocalChildContextByStoragePrefix,
  type LocalChildContext,
} from '@/lib/child-local-access';
import { rememberLocalChildGrant } from '@/lib/child-grant-status';
import {
  consumeTrustedSingleChildAutoOpen,
  setChildExplicitlyLocked,
} from '@/lib/child-unlock-policy';
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
  accessGrantId:
    Id<'childDeviceAccessGrants'>;

  householdId:
    Id<'households'>;

  householdName:
    string;

  childId:
    Id<'children'>;

  childDisplayName:
    string;

  grantedAt:
    number;
};

type ChildAccessGateProps = {
  access:
    ChildAccess;
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
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled =
      false;

    const trustedSingleChildOpen =
      consumeTrustedSingleChildAutoOpen(
        storagePrefix,
      );

    async function loadLocalContext() {
      setLoading(
        true,
      );

      setUnlocked(
        false,
      );

      setErrorMessage(
        null,
      );

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

          setLocalContext(
            null,
          );

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

        setLocalContext(
          context,
        );

        if (
          context &&
          trustedSingleChildOpen
        ) {
          setUnlocked(
            true,
          );
        }
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
          setLoading(
            false,
          );
        }
      }
    }

    void loadLocalContext();

    return () => {
      cancelled =
        true;
    };
  }, [
    access.accessGrantId,
    access.childId,
    storagePrefix,
  ]);

  async function handlePinUnlocked() {
    if (!localContext) {
      return;
    }

    try {
      await setChildExplicitlyLocked(
        localContext.childId,
        false,
      );

      setUnlocked(
        true,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not unlock child profile.',
      );
    }
  }

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-950">
        <ActivityIndicator />

        <Text className="mt-3 text-slate-400">
          Loading child
          profile...
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
        onComplete={(
          context,
        ) => {
          void rememberLocalChildGrant(
            context.contextId,
            access.accessGrantId,
          );

          setLocalContext(
            context,
          );

          setUnlocked(
            true,
          );
        }}
      />
    );
  }

  if (!unlocked) {
    return (
      <ChildPinUnlockScreen
        context={
          localContext
        }
        onUnlocked={() => {
          void handlePinUnlocked();
        }}
      />
    );
  }

  return (
    <ChildHomeScreen
      access={
        access
      }
    />
  );
}
