import {
  Redirect,
} from 'expo-router';

import {
  Task17ActivityMaestroFixtureScreen,
} from '@/components/dev/task17-activity-maestro-fixture-screen';

export default function MaestroTask17ActivityRoute() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task17ActivityMaestroFixtureScreen />
  );
}
