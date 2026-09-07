import { Redirect } from 'expo-router';

import { Task12MaestroFixtureScreen } from '@/components/dev/task12-maestro-fixture-screen';

export default function MaestroTask12Route() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task12MaestroFixtureScreen />
  );
}
