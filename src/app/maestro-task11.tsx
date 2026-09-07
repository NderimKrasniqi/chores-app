import { Redirect } from 'expo-router';

import { Task11MaestroFixtureScreen } from '@/components/dev/task11-maestro-fixture-screen';

export default function MaestroTask11Route() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task11MaestroFixtureScreen />
  );
}
