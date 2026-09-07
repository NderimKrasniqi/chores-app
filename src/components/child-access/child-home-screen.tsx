import { ClaimableChoresCard } from '@/components/chores/claimable-chores-card';
import { PersonalChoresCard } from '@/components/chores/personal-chores-card';
import { setChildExplicitlyLocked } from '@/lib/child-unlock-policy';
import { useAuthRuntime } from '@/providers/auth-runtime-provider';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import type { Id } from '../../../convex/_generated/dataModel';
import { ChildRunningBalanceCard } from './child-running-balance-card';

type ChildHomeScreenProps = {
  access: {
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
};

export function ChildHomeScreen({
  access,
}: ChildHomeScreenProps) {
  const {
    activateParentStorage,
  } = useAuthRuntime();

  async function handleLockAndSwitch() {
    try {
      /*
       * Explicit lock is persistent.
       *
       * Even on a phone with only this
       * Child stored, the next entry must
       * prove the PIN before reopening.
       */
      await setChildExplicitlyLocked(
        access.childId,
        true,
      );

      /*
       * Do NOT sign the Child out.
       *
       * Their Better Auth anonymous
       * session remains inside this
       * Child's isolated SecureStore
       * namespace.
       */
      activateParentStorage();
    } catch (error) {
      Alert.alert(
        'Could not lock profile',
        error instanceof Error
          ? error.message
          : 'Please try again.',
      );
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-6 pt-20 pb-12"
    >
      <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
        {
          access.householdName
        }
      </Text>

      <Text className="mt-3 text-4xl font-bold text-white">
        Hi,{' '}
        {
          access.childDisplayName
        }
      </Text>

      <Text className="mt-3 text-base leading-6 text-slate-400">
        Finish your Personal Chores,
        get Parent approval, and unlock
        extra chores when your current
        Unlock Chore is approved.
      </Text>

      <ChildRunningBalanceCard />

      <View className="p-5 mt-8 border rounded-2xl border-green-900 bg-slate-900">
        <Text className="font-semibold text-green-400">
          Device access active ✓
        </Text>

        <Text className="mt-2 text-sm leading-5 text-slate-400">
          Convex has confirmed
          that this device identity
          has an active access
          grant for{' '}
          {
            access.childDisplayName
          }.
        </Text>
      </View>

      <PersonalChoresCard />

      <ClaimableChoresCard />

      <Pressable
        className="px-4 py-4 mt-8 bg-white rounded-xl"
        onPress={
          handleLockAndSwitch
        }
      >
        <Text className="font-semibold text-center text-slate-950">
          Lock / switch profile
        </Text>
      </Pressable>

      <Text className="mt-4 text-xs leading-5 text-center text-slate-500">
        Locking does not sign this
        Child out. Their secure
        device session remains
        stored, but the PIN is
        required before this profile
        can be opened again.
      </Text>
    </ScrollView>
  );
}
