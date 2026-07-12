import { useEffect, useRef } from "react";
import { AppState as RNAppState } from "react-native";
import * as Haptics from "expo-haptics";

import { getDayKey } from "../model/defaults";
import { isCalendarEventOnDay } from "../model/logic";
import { addDays, dayKeyToDate, timeValueToMinutes } from "../model/time";
import { useExecutionStore } from "../store/executionStore";
import { ensureNotificationPermissions, presentTimerAlert, syncEventReminders } from "./notifications";

// Headless component: drives the wall-clock tick, day rollover, pomodoro
// auto-advance, timer alerts (notification + haptics), and reminder scheduling.
export function ExecutionRuntime() {
  const hydrated = useExecutionStore((store) => store.hydrated);
  const isRunning = useExecutionStore((store) => store.state.isRunning);
  const currentDayKey = useExecutionStore((store) => store.state.currentDayKey);
  const timerAlert = useExecutionStore((store) => store.state.timerAlert);
  const calendarEvents = useExecutionStore((store) => store.state.calendarEvents);
  const lastAlertId = useRef<number | null>(null);

  useEffect(() => {
    useExecutionStore.getState().hydrate();
    ensureNotificationPermissions();
  }, []);

  // 1s tick while running: updates `now` and advances pomodoro when due.
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(() => {
      const store = useExecutionStore.getState();
      store.setNow(Date.now());
      store.maybeAdvancePomodoro();
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // 60s rollover check (web parity) plus a slow `now` refresh when idle.
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useExecutionStore.getState();
      store.checkDayRollover();
      if (!store.state.isRunning) {
        store.setNow(Date.now());
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentDayKey]);

  // Foreground re-sync: recompute now / rollover / pomodoro after backgrounding.
  useEffect(() => {
    const subscription = RNAppState.addEventListener("change", (status) => {
      if (status !== "active") {
        return;
      }

      const store = useExecutionStore.getState();
      store.setNow(Date.now());
      store.checkDayRollover();
      store.maybeAdvancePomodoro();
    });

    return () => subscription.remove();
  }, []);

  // Timer alert side effects (web: Notification + navigator.vibrate).
  useEffect(() => {
    if (!hydrated || !timerAlert || timerAlert.id === lastAlertId.current) {
      return;
    }

    lastAlertId.current = timerAlert.id;
    presentTimerAlert(timerAlert.title, timerAlert.message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [hydrated, timerAlert]);

  // Schedule real local notifications for event reminders over the next 7 days.
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const occurrences: Array<{ id: string; title: string; fireAt: number; startLabel: string }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(today, offset);
      const dayKey = getDayKey(date);

      for (const event of calendarEvents) {
        if (event.reminderMinutes === null || !isCalendarEventOnDay(event, dayKey)) {
          continue;
        }

        const start = dayKeyToDate(dayKey);
        start.setMinutes(timeValueToMinutes(event.startTime));
        occurrences.push({
          id: event.id,
          title: event.title,
          fireAt: start.getTime() - event.reminderMinutes * 60_000,
          startLabel: event.startTime,
        });
      }
    }

    syncEventReminders(occurrences);
  }, [hydrated, calendarEvents]);

  return null;
}
