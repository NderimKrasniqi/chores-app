import { Redirect } from 'expo-router';

import { Task13ParentRejectionMaestroFixtureScreen } from '@/components/dev/task13-parent-rejection-maestro-fixture-screen';

export default function MaestroTask13ParentRoute() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task13ParentRejectionMaestroFixtureScreen />
  );
}
