import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Id } from '../../../convex/_generated/dataModel';

type ChildHomeScreenProps = {
  access: {
    accessGrantId: Id<'childDeviceAccessGrants'>;
    householdId: Id<'households'>;
    householdName: string;
    childId: Id<'children'>;
    childDisplayName: string;
    grantedAt: number;
  };
};

export function ChildHomeScreen({ access }: ChildHomeScreenProps) {
  const [signingOut, setSigningOut] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignOut() {
    setSigningOut(true);
    setErrorMessage(null);

    try {
      await authClient.signOut();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not sign out.',
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View className="justify-center flex-1 px-6 bg-slate-950">
      <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
        {access.householdName}
      </Text>

      <Text className="mt-3 text-4xl font-bold text-white">
        Hi, {access.childDisplayName}
      </Text>

      <Text className="mt-3 text-base leading-6 text-slate-400">
        This device is now securely paired with your child profile.
      </Text>

      <View className="p-5 mt-8 border border-green-900 rounded-2xl bg-slate-900">
        <Text className="font-semibold text-green-400">
          Device access active ✓
        </Text>

        <Text className="mt-2 text-sm leading-5 text-slate-400">
          Convex has confirmed that this anonymous device identity has an active
          access grant for {access.childDisplayName}.
        </Text>
      </View>

      <View className="p-5 mt-4 rounded-2xl bg-slate-900">
        <Text className="font-semibold text-white">Child chores</Text>

        <Text className="mt-2 text-sm leading-5 text-slate-500">
          Chores will appear here in the later chore implementation tasks. This
          screen currently proves child authentication and household
          authorization.
        </Text>
      </View>

      {errorMessage && (
        <Text className="mt-5 text-red-400">{errorMessage}</Text>
      )}

      <Pressable
        className="px-4 py-4 mt-8 border rounded-xl border-slate-700"
        disabled={signingOut}
        onPress={handleSignOut}
      >
        <Text className="font-semibold text-center text-white">
          {signingOut ? 'Signing out...' : 'Exit child session'}
        </Text>
      </Pressable>
    </View>
  );
}
