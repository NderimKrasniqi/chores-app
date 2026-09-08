import {
  View,
} from 'react-native';

import {
  ServerConnectionNotice,
} from '@/components/server-connection-notice';
import {
  useServerConnectionStatus,
} from '@/hooks/use-server-confirmed-mutation';

export function ServerConnectionBanner() {
  const {
    status,
  } =
    useServerConnectionStatus();

  if (
    status ===
    'online'
  ) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      className="absolute left-4 right-4 z-50 top-14"
    >
      <ServerConnectionNotice
        status={
          status
        }
        testID="server-connection-banner"
      />
    </View>
  );
}
