import {
  Redirect,
} from 'expo-router';

import {
  Task15PayoutsMaestroFixtureScreen,
} from '@/components/dev/task15-payouts-maestro-fixture-screen';

export default function MaestroTask15ParentRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Task15PayoutsMaestroFixtureScreen />
  );
}
