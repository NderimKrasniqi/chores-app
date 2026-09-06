import { authClient } from '@/lib/auth-client';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

type AuthMode = 'sign-in' | 'sign-up';

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

function ParentInviteCard({ householdId }: { householdId: Id<'households'> }) {
  const activeInvite = useQuery(api.parentInvites.getActive, {
    householdId,
  });

  const createInvite = useAction(api.parentInvites.create);
  const revokeActiveInvite = useMutation(api.parentInvites.revokeActive);

  const [rawToken, setRawToken] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleGenerateInvite() {
    setWorking(true);
    setInviteError(null);

    try {
      const result = await createInvite({
        householdId,
      });

      setRawToken(result.token);
    } catch (error) {
      setInviteError(
        error instanceof Error
          ? error.message
          : 'Could not create parent invite.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleRevokeInvite() {
    setWorking(true);
    setInviteError(null);

    try {
      await revokeActiveInvite({
        householdId,
      });

      setRawToken(null);
    } catch (error) {
      setInviteError(
        error instanceof Error
          ? error.message
          : 'Could not revoke parent invite.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleShareInvite() {
    if (!rawToken) {
      return;
    }

    try {
      await Share.share({
        message: [
          'Join my Chores App household as a parent.',
          '',
          'Parent invite code:',
          rawToken,
        ].join('\n'),
      });
    } catch (error) {
      setInviteError(
        error instanceof Error
          ? error.message
          : 'Could not share parent invite.',
      );
    }
  }

  return (
    <View className="pt-5 mt-6 border-t border-slate-800">
      <Text className="font-semibold text-white">Parent access</Text>

      <Text className="mt-1 text-sm leading-5 text-slate-500">
        Invite another parent with equal household authority.
      </Text>

      {activeInvite === undefined ? (
        <Text className="mt-3 text-slate-500">Checking invite...</Text>
      ) : activeInvite ? (
        <Text className="mt-3 text-green-400">Active parent invite</Text>
      ) : (
        <Text className="mt-3 text-slate-500">No active parent invite</Text>
      )}

      {rawToken && (
        <View className="p-4 mt-4 rounded-xl bg-slate-950">
          <Text className="text-sm text-slate-500">Invite code</Text>

          <Text selectable className="mt-2 text-sm leading-6 text-white">
            {rawToken}
          </Text>

          <Text className="mt-3 text-xs leading-5 text-slate-500">
            This code is shown only after generation. It is not recoverable from
            the database.
          </Text>

          <Pressable
            className="px-4 py-3 mt-4 bg-white rounded-xl"
            onPress={handleShareInvite}
          >
            <Text className="font-semibold text-center text-slate-950">
              Share invite
            </Text>
          </Pressable>
        </View>
      )}

      {activeInvite && !rawToken && (
        <Text className="mt-3 text-sm leading-5 text-slate-500">
          An invite exists, but its raw code is not stored. Generate a
          replacement to get a new shareable code.
        </Text>
      )}

      {inviteError && <Text className="mt-3 text-red-400">{inviteError}</Text>}

      <Pressable
        className="px-4 py-3 mt-4 border rounded-xl border-slate-700"
        disabled={working}
        onPress={handleGenerateInvite}
      >
        <Text className="font-semibold text-center text-white">
          {working
            ? 'Please wait...'
            : activeInvite
              ? 'Regenerate invite'
              : 'Generate parent invite'}
        </Text>
      </Pressable>

      {activeInvite && (
        <Pressable
          className="px-4 py-3 mt-3 border border-red-900 rounded-xl"
          disabled={working}
          onPress={handleRevokeInvite}
        >
          <Text className="font-semibold text-center text-red-400">
            Revoke invite
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const [mode, setMode] = useState<AuthMode>('sign-up');

  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [householdName, setHouseholdName] = useState('');
  const [timezone, setTimezone] = useState(getDeviceTimezone);

  const [payoutWeekday, setPayoutWeekday] = useState<PayoutWeekday | null>(
    null,
  );

  const [weeklyUnclaimAllowance, setWeeklyUnclaimAllowance] = useState('');

  const [children, setChildren] = useState<string[]>(['']);

  const [parentInviteToken, setParentInviteToken] = useState('');

  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [joiningHousehold, setJoiningHousehold] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, isPending: sessionPending } = authClient.useSession();

  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();

  const households = useQuery(
    api.households.listForCurrentParent,
    isAuthenticated ? {} : 'skip',
  );

  const createHousehold = useMutation(api.households.create);
  const acceptParentInvite = useAction(api.parentInvites.accept);

  async function handleAuthSubmit() {
    setSubmittingAuth(true);
    setErrorMessage(null);

    try {
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({
              name: parentName.trim(),
              email: email.trim(),
              password,
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
            });

      if (result.error) {
        setErrorMessage(result.error.message ?? 'Authentication failed.');
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmittingAuth(false);
    }
  }

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

  if (sessionPending || convexAuthLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-950">
        <ActivityIndicator />

        <Text className="mt-3 text-slate-400">Checking session...</Text>
      </View>
    );
  }

  if (!session?.user) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-slate-950"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="justify-center flex-1 px-6">
            <Text className="text-3xl font-bold text-white">
              {mode === 'sign-up' ? 'Create parent account' : 'Parent sign in'}
            </Text>

            <Text className="mt-2 text-slate-400">Chores App</Text>

            {mode === 'sign-up' && (
              <TextInput
                className="px-4 py-4 mt-8 text-white border rounded-xl border-slate-700 bg-slate-900"
                placeholder="Name"
                placeholderTextColor="#64748b"
                value={parentName}
                onChangeText={setParentName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              className="px-4 py-4 mt-3 text-white border rounded-xl border-slate-700 bg-slate-900"
              placeholder="Email"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <TextInput
              className="px-4 py-4 mt-3 text-white border rounded-xl border-slate-700 bg-slate-900"
              placeholder="Password"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {errorMessage && (
              <Text className="mt-3 text-red-400">{errorMessage}</Text>
            )}

            <Pressable
              className="px-4 py-4 mt-5 bg-white rounded-xl"
              disabled={submittingAuth}
              onPress={handleAuthSubmit}
            >
              <Text className="font-semibold text-center text-slate-950">
                {submittingAuth
                  ? 'Please wait...'
                  : mode === 'sign-up'
                    ? 'Create account'
                    : 'Sign in'}
              </Text>
            </Pressable>

            <Pressable
              className="mt-5"
              onPress={() => {
                setErrorMessage(null);

                setMode((current) =>
                  current === 'sign-up' ? 'sign-in' : 'sign-up',
                );
              }}
            >
              <Text className="text-center text-slate-400">
                {mode === 'sign-up'
                  ? 'Already have an account? Sign in'
                  : 'Need an account? Sign up'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
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
      <ScrollView
        className="flex-1 bg-slate-950"
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 48,
        }}
      >
        <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
          Parent
        </Text>

        <Text className="mt-1 text-2xl font-bold text-white">
          {session.user.name}
        </Text>

        <Text className="mt-1 text-slate-400">{session.user.email}</Text>

        <Text className="mt-10 text-3xl font-bold text-white">
          Your household
        </Text>

        {households.map((household) => (
          <View
            key={household.householdId}
            className="p-5 mt-5 border rounded-2xl border-slate-800 bg-slate-900"
          >
            <Text className="text-2xl font-bold text-white">
              {household.name}
            </Text>

            <View className="mt-5">
              <Text className="text-sm text-slate-500">Timezone</Text>

              <Text className="mt-1 text-base text-white">
                {household.timezone}
              </Text>
            </View>

            <View className="mt-4">
              <Text className="text-sm text-slate-500">Payout day</Text>

              <Text className="mt-1 text-base text-white">
                {formatWeekday(household.payoutWeekday)}
              </Text>
            </View>

            <View className="mt-4">
              <Text className="text-sm text-slate-500">Weekly unclaims</Text>

              <Text className="mt-1 text-base text-white">
                {household.weeklyUnclaimAllowance}
              </Text>
            </View>

            <View className="pt-5 mt-6 border-t border-slate-800">
              <Text className="font-semibold text-white">Children</Text>

              {household.children.map((child) => (
                <View
                  key={child.childId}
                  className="px-4 py-3 mt-3 rounded-xl bg-slate-800"
                >
                  <Text className="text-white">{child.displayName}</Text>
                </View>
              ))}
            </View>

            <ParentInviteCard householdId={household.householdId} />
          </View>
        ))}

        {errorMessage && (
          <Text className="mt-4 text-red-400">{errorMessage}</Text>
        )}

        <Pressable
          className="px-4 py-4 mt-8 border rounded-xl border-slate-700"
          onPress={handleSignOut}
        >
          <Text className="font-semibold text-center text-white">Sign out</Text>
        </Pressable>
      </ScrollView>
    );
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
