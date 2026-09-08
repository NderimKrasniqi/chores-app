import { useServerConfirmedMutation } from '@/hooks/use-server-confirmed-mutation';
import {
  useQuery,
} from 'convex/react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type ChildDeviceListProps = {
  childId: Id<'children'>;
};

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export function ChildDeviceList({ childId }: ChildDeviceListProps) {
  const devices = useQuery(api.childAccess.listDevicesForChild, {
    childId,
  });

  const revokeDevice = useServerConfirmedMutation(api.childPairing.revokeDevice);

  const [revokingGrantId, setRevokingGrantId] =
    useState<Id<'childDeviceAccessGrants'> | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRevokeDevice(
    accessGrantId: Id<'childDeviceAccessGrants'>,
  ) {
    setRevokingGrantId(accessGrantId);
    setErrorMessage(null);

    try {
      await revokeDevice({
        accessGrantId,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not revoke child device.',
      );
    } finally {
      setRevokingGrantId(null);
    }
  }

  if (devices === undefined) {
    return (
      <View className="pt-5 mt-5 border-t border-slate-700">
        <Text className="font-semibold text-white">Paired devices</Text>

        <Text className="mt-2 text-sm text-slate-500">Checking devices...</Text>
      </View>
    );
  }

  const activeDevices = devices.filter((device) => device.isActive);

  const revokedDevices = devices.filter((device) => !device.isActive);

  return (
    <View className="pt-5 mt-5 border-t border-slate-700">
      <Text className="font-semibold text-white">Paired devices</Text>

      <Text className="mt-1 text-sm leading-5 text-slate-400">
        Revoking a device immediately removes its Convex child access.
      </Text>

      {activeDevices.length === 0 ? (
        <Text className="mt-3 text-sm text-slate-500">
          No active paired devices.
        </Text>
      ) : (
        activeDevices.map((device, index) => (
          <View
            key={device.accessGrantId}
            className="p-3 mt-3 border rounded-xl border-slate-700"
          >
            <Text className="font-semibold text-white">
              Paired device {index + 1}
            </Text>

            <Text className="mt-1 text-xs text-slate-500">
              Paired {formatDateTime(device.createdAt)}
            </Text>

            <Text className="mt-2 text-sm text-green-400">Active</Text>

            <Pressable
              className="px-3 py-2 mt-3 border border-red-900 rounded-lg"
              disabled={revokingGrantId === device.accessGrantId}
              onPress={() => handleRevokeDevice(device.accessGrantId)}
            >
              <Text className="font-semibold text-center text-red-400">
                {revokingGrantId === device.accessGrantId
                  ? 'Revoking...'
                  : 'Revoke device'}
              </Text>
            </Pressable>
          </View>
        ))
      )}

      {revokedDevices.length > 0 && (
        <View className="mt-5">
          <Text className="text-sm font-semibold text-slate-400">
            Revoked devices
          </Text>

          {revokedDevices.map((device) => (
            <View
              key={device.accessGrantId}
              className="p-3 mt-3 rounded-xl bg-slate-900"
            >
              <Text className="text-sm text-slate-400">
                Paired {formatDateTime(device.createdAt)}
              </Text>

              {device.revokedAt !== undefined && (
                <Text className="mt-1 text-xs text-slate-600">
                  Revoked {formatDateTime(device.revokedAt)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {errorMessage && (
        <Text className="mt-4 text-red-400">{errorMessage}</Text>
      )}
    </View>
  );
}
