import { LogBox, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// This service is intentionally local-only.
// We do not register for Expo push tokens or set up remote notifications here.
export const INACTIVITY_REMINDER_DELAY_SECONDS = 86400;

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
  '`expo-notifications` functionality is not fully supported in Expo Go:',
]);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureNotificationPermission() {
  if (Platform.OS === 'web') {
    console.log('[reminder] notification permission denied on web');
    return false;
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.granted || currentPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    console.log('[reminder] notification permission granted');
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  const granted =
    requestedPermissions.granted ||
    requestedPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  console.log(`[reminder] notification permission ${granted ? 'granted' : 'denied'}`);
  return granted;
}

export async function refreshInactivityReminder() {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return;
  }

  // We only want one "come back" reminder at a time, so every refresh starts by clearing the old one.
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[reminder] old reminder cancelled');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SpaceWars misses you!',
      body: 'Come back and play another run.',
    },
    trigger: {
      // Keeping the delay in one constant makes it easy to flip between testing and real timing later.
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: INACTIVITY_REMINDER_DELAY_SECONDS,
    },
  });

  console.log('[reminder] new reminder scheduled');
}
