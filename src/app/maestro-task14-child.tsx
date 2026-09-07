import {
  Redirect,
} from 'expo-router';

import {
  Task14RunningBalanceMaestroFixtureScreen,
} from '@/components/dev/task14-running-balance-maestro-fixture-screen';

export default function MaestroTask14ChildRoute() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task14RunningBalanceMaestroFixtureScreen />
  );
}
