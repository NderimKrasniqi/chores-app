import {
  Redirect,
} from 'expo-router';

import { Task13ChildRedoMaestroFixtureScreen } from '@/components/dev/task13-child-redo-maestro-fixture-screen';

export default function MaestroTask13ChildRoute() {
  if (!__DEV__) {
    return (
      <Redirect href="/" />
    );
  }

  return (
    <Task13ChildRedoMaestroFixtureScreen />
  );
}
