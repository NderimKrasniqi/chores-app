import { EntryChoiceScreen } from '@/components/auth/entry-choice-screen';
import { ParentAuthScreen } from '@/components/auth/parent-auth-screen';
import { ChildAccessGate } from '@/components/child-access/child-access-gate';
import { ChildNoAccessScreen } from '@/components/child-access/child-no-access-screen';
import { HouseholdListScreen } from '@/components/household/household-list-screen';
import { HouseholdSetupScreen } from '@/components/household/household-setup-screen';
import { authClient } from '@/lib/auth-client';
import {
  useConvexAuth,
  useQuery,
} from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Text,
  View,
} from 'react-native';

import { api } from '../../convex/_generated/api';

type EntryMode =
  | 'choose'
  | 'parent';

function isAnonymousUser(
  user: object,
) {
  return (
    'isAnonymous' in user &&
    user.isAnonymous === true
  );
}

function LoadingScreen({
  message,
}: {
  message: string;
}) {
  return (
    <View className="items-center justify-center flex-1 bg-slate-950">
      <ActivityIndicator />

      <Text className="mt-3 text-slate-400">
        {message}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const [
    entryMode,
    setEntryMode,
  ] =
    useState<EntryMode>(
      'choose',
    );

  const {
    data: session,
    isPending: sessionPending,
  } = authClient.useSession();

  const {
    isAuthenticated,
    isLoading: convexAuthLoading,
  } = useConvexAuth();

  const hasSession =
    session?.user !== undefined;

  const anonymousSession =
    session?.user
      ? isAnonymousUser(
          session.user,
        )
      : false;

  const households = useQuery(
    api.households.listForCurrentParent,

    isAuthenticated &&
      hasSession &&
      !anonymousSession
      ? {}
      : 'skip',
  );

  const childAccess = useQuery(
    api.childAccess.getCurrentChildAccess,

    isAuthenticated &&
      hasSession &&
      anonymousSession
      ? {}
      : 'skip',
  );

  if (
    sessionPending ||
    convexAuthLoading
  ) {
    return (
      <LoadingScreen message="Checking session..." />
    );
  }

  if (!session?.user) {
    if (
      entryMode === 'parent'
    ) {
      return (
        <ParentAuthScreen
          onBack={() =>
            setEntryMode(
              'choose',
            )
          }
        />
      );
    }

    return (
      <EntryChoiceScreen
        onChooseParent={() =>
          setEntryMode(
            'parent',
          )
        }
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <LoadingScreen message="Connecting secure session..." />
    );
  }

  if (anonymousSession) {
    if (
      childAccess === undefined
    ) {
      return (
        <LoadingScreen message="Checking child access..." />
      );
    }

    if (
      childAccess === null
    ) {
      return (
        <ChildNoAccessScreen />
      );
    }

    return (
      <ChildAccessGate
        access={childAccess}
      />
    );
  }

  if (
    households === undefined
  ) {
    return (
      <LoadingScreen message="Loading household..." />
    );
  }

  if (
    households.length > 0
  ) {
    return (
      <HouseholdListScreen
        parentName={
          session.user.name
        }
        parentEmail={
          session.user.email
        }
        households={
          households
        }
      />
    );
  }

  return (
    <HouseholdSetupScreen />
  );
}
