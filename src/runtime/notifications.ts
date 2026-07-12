import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// expo-notifications is unavailable in Expo Go on Android (SDK 53+).
// Guard every call so the dev preview keeps working; real behavior ships in the iOS build.
const notificationsSupported = !(
  Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
);

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null = null;

function getModule(): NotificationsModule | null {
  if (!notificationsSupported) {
    return null;
  }

  if (!notificationsModule) {
    try {
      notificationsModule = require("expo-notifications") as NotificationsModule;
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch {
      notificationsModule = null;
    }
  }

  return notificationsModule;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const module = getModule();
  if (!module) {
    return false;
  }

  try {
    const current = await module.getPermissionsAsync();
    if (current.granted) {
      return true;
    }

    const requested = await module.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function presentTimerAlert(title: string, body: string) {
  const module = getModule();
  if (!module) {
    return;
  }

  try {
    await module.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // Ignore: notification delivery is best-effort.
  }
}

// Reschedules local notifications for upcoming event reminders (next 7 days,
// max 32 scheduled — iOS caps pending notifications at 64).
export async function syncEventReminders(
  occurrences: Array<{ id: string; title: string; fireAt: number; startLabel: string }>,
) {
  const module = getModule();
  if (!module) {
    return;
  }

  try {
    const scheduled = await module.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((item) => item.content.data?.kind === "event-reminder")
        .map((item) => module.cancelScheduledNotificationAsync(item.identifier)),
    );

    const now = Date.now();
    const upcoming = occurrences
      .filter((item) => item.fireAt > now)
      .sort((left, right) => left.fireAt - right.fireAt)
      .slice(0, 32);

    await Promise.all(
      upcoming.map((item) =>
        module.scheduleNotificationAsync({
          content: {
            title: item.title,
            body: `Starts at ${item.startLabel}`,
            data: { kind: "event-reminder", eventId: item.id },
          },
          trigger: { type: module.SchedulableTriggerInputTypes.DATE, date: new Date(item.fireAt) },
        }),
      ),
    );
  } catch {
    // Ignore: reminder scheduling is best-effort.
  }
}
