import { Task10MaestroFixtureScreen } from '@/components/dev/task10-maestro-fixture-screen';
import {
  Redirect,
} from 'expo-router';

export default function MaestroTask10Route() {
  /*
   * Fixture data must never become part
   * of the production user experience.
   */
  if (
    !__DEV__
  ) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task10MaestroFixtureScreen />
  );
}
