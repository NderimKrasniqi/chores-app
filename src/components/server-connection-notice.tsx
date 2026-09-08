import {
  Text,
  View,
} from 'react-native';

import type {
  ServerConnectionStatus,
} from '@/hooks/use-server-confirmed-mutation';

export function getServerConnectionMessage(
  status:
    ServerConnectionStatus,
) {
  switch (status) {
    case 'recovering':
      return 'Connection lost — checking whether your last change reached the server. Do not repeat the action.';

    case 'offline':
      return 'Offline — showing last synced data. Changes are disabled until the server reconnects.';

    case 'connecting':
      return 'Connecting to the server — changes are unavailable until connected.';

    case 'online':
      return null;
  }
}

export function ServerConnectionNotice({
  status,
  testID =
    'server-connection-notice',
}: {
  status:
    ServerConnectionStatus;

  testID?:
    string;
}) {
  const message =
    getServerConnectionMessage(
      status,
    );

  if (!message) {
    return null;
  }

  return (
    <View
      testID={
        testID
      }
      className="px-4 py-3 border rounded-xl border-amber-700 bg-amber-950"
    >
      <Text className="text-sm font-medium leading-5 text-amber-200">
        {message}
      </Text>
    </View>
  );
}
