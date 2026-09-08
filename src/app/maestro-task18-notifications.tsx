import {
  Redirect,
} from 'expo-router';

import {
  Task18NotificationsMaestroFixtureScreen,
} from '@/components/dev/task18-notifications-maestro-fixture-screen';

export default function MaestroTask18NotificationsRoute() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task18NotificationsMaestroFixtureScreen />
  );
}
