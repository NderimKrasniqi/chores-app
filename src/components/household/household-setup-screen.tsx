import { authClient } from '@/lib/auth/client';
import { useAction, useMutation } from 'convex/react';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';

const PAYOUT_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

type PayoutWeekday = (typeof PAYOUT_WEEKDAYS)[number];

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

function formatWeekday(day: PayoutWeekday) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function HouseholdSetupScreen() {
  const [householdName, setHouseholdName] = useState('');

  const [timezone, setTimezone] = useState(getDeviceTimezone);

  const [payoutWeekday, setPayoutWeekday] = useState<PayoutWeekday | null>(
    null,
  );

  const [weeklyUnclaimAllowance, setWeeklyUnclaimAllowance] = useState('');

  const [children, setChildren] = useState<string[]>(['']);

  const [parentInviteToken, setParentInviteToken] = useState('');

  const [creatingHousehold, setCreatingHousehold] = useState(false);

  const [joiningHousehold, setJoiningHousehold] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createHousehold = useMutation(api.households.create);

  const acceptParentInvite = useAction(api.parentInvites.accept);

  async function handleCreateHousehold() {
    setErrorMessage(null);

    const name = householdName.trim();

    const householdTimezone = timezone.trim();

    if (!name) {
      setErrorMessage('Enter a household name.');
      return;
    }

    if (!householdTimezone) {
      setErrorMessage('Enter a household timezone.');
      return;
    }

    if (!payoutWeekday) {
      setErrorMessage('Choose a payout weekday.');
      return;
    }

    if (!/^\d+$/.test(weeklyUnclaimAllowance)) {
      setErrorMessage(
        'Weekly unclaim allowance must be a non-negative whole number.',
      );
      return;
    }

    const normalizedChildren = children.map((child) => child.trim());

    if (normalizedChildren.some((child) => !child)) {
      setErrorMessage('Each child needs a name.');
      return;
    }

    setCreatingHousehold(true);

    try {
      await createHousehold({
        name,
        timezone: householdTimezone,
        payoutWeekday,
        weeklyUnclaimAllowance: Number(weeklyUnclaimAllowance),
        children: normalizedChildren.map((displayName) => ({
          displayName,
        })),
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not create household.',
      );
    } finally {
      setCreatingHousehold(false);
    }
  }

  async function handleJoinHousehold() {
    setErrorMessage(null);

    const token = parentInviteToken.trim();

    if (!token) {
      setErrorMessage('Enter a parent invite code.');
      return;
    }

    setJoiningHousehold(true);

    try {
      await acceptParentInvite({
        token,
      });

      setParentInviteToken('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not join household.',
      );
    } finally {
      setJoiningHousehold(false);
    }
  }

  function updateChild(index: number, value: string) {
    setChildren((current) =>
      current.map((child, childIndex) =>
        childIndex === index ? value : child,
      ),
    );
  }

  function addChild() {
    setChildren((current) => [...current, '']);
  }

  function removeChild(index: number) {
    setChildren((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, childIndex) => childIndex !== index);
    });
  }

  async function handleSignOut() {
    setErrorMessage(null);

    try {
      await authClient.signOut();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not sign out.',
      );
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 48,
          paddingBottom: 48,
        }}
      >
        <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
          Household setup
        </Text>

        <Text className="mt-2 text-3xl font-bold text-white">
          Set up your family
        </Text>

        <Text className="mt-2 text-base leading-6 text-slate-400">
          Create a new household or join one using a parent invite.
        </Text>

        <View className="p-5 mt-8 border rounded-2xl border-slate-800 bg-slate-900">
          <Text className="text-xl font-bold text-white">
            Join an existing household
          </Text>

          <Text className="mt-2 text-sm leading-5 text-slate-400">
            If another parent invited you, paste the parent invite code here.
          </Text>

          <TextInput
            className="px-4 py-4 mt-4 text-white border rounded-xl border-slate-700 bg-slate-950"
            placeholder="Parent invite code"
            placeholderTextColor="#64748b"
            value={parentInviteToken}
            onChangeText={setParentInviteToken}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            className="px-4 py-4 mt-4 bg-white rounded-xl"
            disabled={joiningHousehold}
            onPress={handleJoinHousehold}
          >
            <Text className="font-semibold text-center text-slate-950">
              {joiningHousehold ? 'Joining household...' : 'Join household'}
            </Text>
          </Pressable>
        </View>

        <Text className="mt-10 text-xl font-bold text-white">
          Or create a new household
        </Text>

        <Text className="mt-8 font-semibold text-white">Household name</Text>

        <TextInput
          className="px-4 py-4 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
          placeholder="Krasniqi Family"
          placeholderTextColor="#64748b"
          value={householdName}
          onChangeText={setHouseholdName}
        />

        <Text className="mt-6 font-semibold text-white">
          Household timezone
        </Text>

        <Text className="mt-1 text-sm leading-5 text-slate-500">
          Use an IANA timezone such as Europe/Stockholm.
        </Text>

        <TextInput
          className="px-4 py-4 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
          placeholder="Europe/Stockholm"
          placeholderTextColor="#64748b"
          value={timezone}
          onChangeText={setTimezone}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text className="mt-6 font-semibold text-white">Payout weekday</Text>

        <View className="flex-row flex-wrap gap-2 mt-3">
          {PAYOUT_WEEKDAYS.map((day) => (
            <Pressable
              key={day}
              className={
                payoutWeekday === day
                  ? 'rounded-xl bg-white px-4 py-3'
                  : 'rounded-xl border border-slate-700 bg-slate-900 px-4 py-3'
              }
              onPress={() => setPayoutWeekday(day)}
            >
              <Text
                className={
                  payoutWeekday === day
                    ? 'font-semibold text-slate-950'
                    : 'font-semibold text-slate-300'
                }
              >
                {formatWeekday(day)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-6 font-semibold text-white">
          Weekly unclaim allowance
        </Text>

        <Text className="mt-1 text-sm leading-5 text-slate-500">
          This allowance applies equally to every child each payout week.
        </Text>

        <TextInput
          className="px-4 py-4 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
          placeholder="Enter a whole number"
          placeholderTextColor="#64748b"
          value={weeklyUnclaimAllowance}
          onChangeText={setWeeklyUnclaimAllowance}
          keyboardType="number-pad"
        />

        <View className="flex-row items-center justify-between mt-8">
          <Text className="font-semibold text-white">Children</Text>

          <Pressable
            className="px-3 py-2 border rounded-lg border-slate-700"
            onPress={addChild}
          >
            <Text className="font-semibold text-white">+ Add child</Text>
          </Pressable>
        </View>

        {children.map((child, index) => (
          <View key={index} className="flex-row items-center gap-2 mt-3">
            <TextInput
              className="flex-1 px-4 py-4 text-white border rounded-xl border-slate-700 bg-slate-900"
              placeholder={`Child ${index + 1} name`}
              placeholderTextColor="#64748b"
              value={child}
              onChangeText={(value) => updateChild(index, value)}
              autoCapitalize="words"
            />

            {children.length > 1 && (
              <Pressable
                className="px-4 py-4 border rounded-xl border-slate-700"
                onPress={() => removeChild(index)}
              >
                <Text className="text-slate-300">Remove</Text>
              </Pressable>
            )}
          </View>
        ))}

        {errorMessage && (
          <Text className="mt-5 text-red-400">{errorMessage}</Text>
        )}

        <Pressable
          className="px-4 py-4 mt-8 bg-white rounded-xl"
          disabled={creatingHousehold}
          onPress={handleCreateHousehold}
        >
          <Text className="font-semibold text-center text-slate-950">
            {creatingHousehold ? 'Creating household...' : 'Create household'}
          </Text>
        </Pressable>

        <Pressable className="mt-4" onPress={handleSignOut}>
          <Text className="text-center text-slate-500">Sign out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
