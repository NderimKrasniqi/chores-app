import { Redirect } from 'expo-router';

import { Task11ParentCancellationMaestroFixtureScreen } from '@/components/dev/task11-parent-cancellation-maestro-fixture-screen';

export default function MaestroTask11ParentRoute() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task11ParentCancellationMaestroFixtureScreen />
  );
}
