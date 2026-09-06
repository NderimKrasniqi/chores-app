import { useAuthRuntime } from '@/providers/auth-runtime-provider';
import {
  Pressable,
  Text,
  View,
} from 'react-native';

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

export function ChildHomeScreen({
  access,
}: ChildHomeScreenProps) {
  const {
    activateParentStorage,
  } = useAuthRuntime();

  function handleLockAndSwitch() {
    /*
     * Do NOT sign the Child out.
     *
     * Their Better Auth anonymous session remains
     * securely stored inside that Child's isolated
     * SecureStore namespace.
     *
     * We simply switch back to the default context,
     * which locks this profile in memory.
     */
    activateParentStorage();
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
        This device is securely paired with
        your child profile.
      </Text>

      <View className="p-5 mt-8 border rounded-2xl border-green-900 bg-slate-900">
        <Text className="font-semibold text-green-400">
          Device access active ✓
        </Text>

        <Text className="mt-2 text-sm leading-5 text-slate-400">
          Convex has confirmed that this
          device identity has an active
          access grant for{' '}
          {access.childDisplayName}.
        </Text>
      </View>

      <View className="p-5 mt-4 rounded-2xl bg-slate-900">
        <Text className="font-semibold text-white">
          Child chores
        </Text>

        <Text className="mt-2 text-sm leading-5 text-slate-500">
          Chores will appear here in the
          later chore implementation tasks.
          This screen currently proves Child
          authentication and authorization.
        </Text>
      </View>

      <Pressable
        className="px-4 py-4 mt-8 bg-white rounded-xl"
        onPress={handleLockAndSwitch}
      >
        <Text className="font-semibold text-center text-slate-950">
          Lock / switch profile
        </Text>
      </Pressable>

      <Text className="mt-4 text-xs leading-5 text-center text-slate-500">
        Locking does not sign this Child out.
        Their secure device session remains
        available after PIN verification.
      </Text>
    </View>
  );
}
