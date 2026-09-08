import { useServerConfirmedMutation } from '@/hooks/use-server-confirmed-mutation';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import {
  useConvexAuth,
} from 'convex/react';
import {
  useEffect,
} from 'react';
import {
  Platform,
} from 'react-native';

import {
  api,
} from '../../../convex/_generated/api';

Notifications.setNotificationHandler({
  handleNotification:
    async () => ({
      shouldPlaySound:
        false,

      shouldSetBadge:
        false,

      shouldShowBanner:
        true,

      shouldShowList:
        true,
    }),
});

function getExpoProjectId() {
  const extra =
    Constants.expoConfig
      ?.extra as
      | {
          eas?: {
            projectId?:
              string;
          };
        }
      | undefined;

  return (
    extra?.eas
      ?.projectId ??
    Constants.easConfig
      ?.projectId ??
    null
  );
}

export function PushRegistrationBridge() {
  const {
    isAuthenticated,
    isLoading,
  } =
    useConvexAuth();

  const registerDevice =
    useServerConfirmedMutation(
      api
        .pushNotifications
        .registerCurrentDevice,
    );

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated
    ) {
      return;
    }

    let cancelled =
      false;

    let tokenSubscription:
      Notifications.EventSubscription |
      undefined;

    async function register() {
      if (
        Platform.OS !==
          'ios' &&
        Platform.OS !==
          'android'
      ) {
        return;
      }

      if (
        Platform.OS ===
        'android'
      ) {
        await Notifications
          .setNotificationChannelAsync(
            'default',
            {
              name:
                'Chores',

              importance:
                Notifications
                  .AndroidImportance
                  .DEFAULT,
            },
          );
      }

      let permissions =
        await Notifications
          .getPermissionsAsync();

      if (
        !permissions.granted &&
        permissions.status ===
          'undetermined'
      ) {
        permissions =
          await Notifications
            .requestPermissionsAsync();
      }

      if (
        !permissions.granted
      ) {
        return;
      }

      const projectId =
        getExpoProjectId();

      if (!projectId) {
        return;
      }

      const resolvedProjectId:
        string =
        projectId;

      async function persistToken() {
        const token =
          await Notifications
            .getExpoPushTokenAsync({
              projectId:
                resolvedProjectId,
            });

        if (cancelled) {
          return;
        }

        await registerDevice({
          expoPushToken:
            token.data,

          platform:
            Platform.OS as
              | 'ios'
              | 'android',
        });
      }

      await persistToken();

      tokenSubscription =
        Notifications
          .addPushTokenListener(
            () => {
              void persistToken();
            },
          );
    }

    void register();

    return () => {
      cancelled =
        true;

      tokenSubscription
        ?.remove();
    };
  }, [
    isAuthenticated,
    isLoading,
    registerDevice,
  ]);

  return null;
}
