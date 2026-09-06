import { useAction, useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type ParentInviteCardProps = {
  householdId: Id<'households'>;
};

export function ParentInviteCard({ householdId }: ParentInviteCardProps) {
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
