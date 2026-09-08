import {
  Redirect,
} from 'expo-router';

import {
  Task22SecureStoreCleanupMaestroFixtureScreen,
} from '@/components/dev/task22-securestore-cleanup-maestro-fixture-screen';

export default function MaestroTask22SecureStoreRoute() {
  if (!__DEV__) {
    return (
      <Redirect
        href="/"
      />
    );
  }

  return (
    <Task22SecureStoreCleanupMaestroFixtureScreen />
  );
}
