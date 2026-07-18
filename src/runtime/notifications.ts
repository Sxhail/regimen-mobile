import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

import type { PomodoroPhase } from "../model/types";

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

// Immediate, foreground-triggered alert. Drives the pomodoro phase-boundary
// haptic/banner when the app is open, and the free-timer / task "session
// complete" notice. Free timers count up with no fixed end, so this immediate
// path (no scheduled notification) is the correct mechanism for them.
export async function presentTimerAlert(title: string, body: string) {
  const module = getModule();
  if (!module) {
    return;
  }

  try {
    await module.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: null,
    });
  } catch {
    // Ignore: notification delivery is best-effort.
  }
}

const POMODORO_PHASE_END_KIND = "pomodoro-phase-end";

// Schedules a DATE-triggered local notification for the moment the current
// pomodoro phase ends. iOS delivers scheduled local notifications even when the
// app is backgrounded or force-quit (and re-registers them across reboot), so
// the phase-end alert arrives without the app running.
//
// NOTE: only the NEXT phase boundary is guaranteed while backgrounded. Advancing
// to the phase after that requires the app to foreground (see ExecutionRuntime
// resync), which reschedules the following boundary.
export async function schedulePomodoroPhaseEndNotification(
  fireAt: Date,
  phase: PomodoroPhase,
  breakMinutes: number,
): Promise<string | null> {
  const module = getModule();
  if (!module) {
    return null;
  }

  // Nothing to schedule for a boundary already in the past.
  if (fireAt.getTime() <= Date.now()) {
    return null;
  }

  const content =
    phase === "focus"
      ? {
          title: "Focus complete",
          body:
            breakMinutes > 0
              ? `Nice work. Take a ${breakMinutes}-minute break.`
              : "Nice work. Starting your next focus block.",
          sound: "default",
          data: { kind: POMODORO_PHASE_END_KIND },
        }
      : {
          title: "Break's over",
          body: "Ready when you are — start your next focus block.",
          sound: "default",
          data: { kind: POMODORO_PHASE_END_KIND },
        };

  try {
    return await module.scheduleNotificationAsync({
      content,
      trigger: { type: module.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  } catch {
    // Ignore: scheduling is best-effort.
    return null;
  }
}

// Cancels any pending pomodoro phase-end notifications. Queries the scheduled
// set and filters by content.data.kind so it stays correct even if the app was
// restarted and lost the in-memory identifier.
export async function cancelPomodoroPhaseEndNotifications() {
  const module = getModule();
  if (!module) {
    return;
  }

  try {
    const scheduled = await module.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((item) => item.content.data?.kind === POMODORO_PHASE_END_KIND)
        .map((item) => module.cancelScheduledNotificationAsync(item.identifier)),
    );
  } catch {
    // Ignore: cancellation is best-effort.
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
            title: `Upcoming: ${item.title}`,
            body: `Starts at ${item.startLabel}.`,
            sound: "default",
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
