import { ParentAuthScreen } from '@/components/auth/parent-auth-screen';
import { HouseholdListScreen } from '@/components/household/household-list-screen';
import { HouseholdSetupScreen } from '@/components/household/household-setup-screen';
import { authClient } from '@/lib/auth-client';
import { useConvexAuth, useQuery } from 'convex/react';
import { ActivityIndicator, Text, View } from 'react-native';

import { api } from '../../convex/_generated/api';

export default function HomeScreen() {
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();

  const households = useQuery(
    api.households.listForCurrentParent,
    isAuthenticated ? {} : 'skip',
  );

  if (sessionPending || convexAuthLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-950">
        <ActivityIndicator />

        <Text className="mt-3 text-slate-400">Checking session...</Text>
      </View>
    );
  }

  if (!session?.user) {
    return <ParentAuthScreen />;
  }

  if (!isAuthenticated || households === undefined) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-950">
        <ActivityIndicator />

        <Text className="mt-3 text-slate-400">Loading household...</Text>
      </View>
    );
  }

  if (households.length > 0) {
    return (
      <HouseholdListScreen
        parentName={session.user.name}
        parentEmail={session.user.email}
        households={households}
      />
    );
  }

  return <HouseholdSetupScreen />;
}
