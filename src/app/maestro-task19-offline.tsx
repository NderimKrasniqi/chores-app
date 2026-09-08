import {
  Redirect,
} from 'expo-router';

import {
  Task19OfflineRecoveryMaestroFixtureScreen,
} from '@/components/dev/task19-offline-recovery-maestro-fixture-screen';

export default function MaestroTask19OfflineRoute() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task19OfflineRecoveryMaestroFixtureScreen />
  );
}
