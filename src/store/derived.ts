import { useMemo } from "react";

import { getDayKey } from "../model/defaults";
import {
  buildSnapshot,
  getCalendarEventDurationSeconds,
  getCompletedTasksForDay,
  getDaysWonCount,
  getDerivedElapsedSeconds,
  isCalendarEventOnDay,
  isSnapshotWon,
} from "../model/logic";
import { formatDateLabel } from "../model/time";
import type { CalendarEvent, DailySnapshot, Task, WeeklyPoint } from "../model/types";
import { useExecutionStore } from "./executionStore";

export function useAppState() {
  return useExecutionStore((store) => store.state);
}

export function useNow() {
  return useExecutionStore((store) => store.now);
}

export function useDerivedFocusElapsedSeconds() {
  const state = useAppState();
  const now = useNow();
  const derivedElapsedSeconds = getDerivedElapsedSeconds(state, now);
  return state.timerMode === "pomodoro" && state.pomodoroPhase !== "focus" ? 0 : derivedElapsedSeconds;
}

export function useActiveTask(): Task | null {
  const state = useAppState();
  return useMemo(() => state.tasks.find((task) => task.id === state.activeTaskId) ?? null, [state.tasks, state.activeTaskId]);
}

export function useActiveCalendarEvent(): CalendarEvent | null {
  const state = useAppState();
  return useMemo(
    () => state.calendarEvents.find((event) => event.id === state.activeCalendarEventId) ?? null,
    [state.calendarEvents, state.activeCalendarEventId],
  );
}

// Tasks with the running task's live seconds folded in.
export function useLiveTasks(): Task[] {
  const state = useAppState();
  const derivedFocusElapsedSeconds = useDerivedFocusElapsedSeconds();

  return useMemo(
    () =>
      state.tasks.map((task) =>
        task.id === state.activeTaskId && state.isRunning
          ? { ...task, secondsSpent: task.secondsSpent + derivedFocusElapsedSeconds }
          : task,
      ),
    [derivedFocusElapsedSeconds, state.activeTaskId, state.isRunning, state.tasks],
  );
}

export function useSessionSeconds() {
  const state = useAppState();
  return state.sessionSeconds + useDerivedFocusElapsedSeconds();
}

export function useTodayFocusSeconds() {
  const state = useAppState();
  return state.todayFocusSeconds + useDerivedFocusElapsedSeconds();
}

export function useTimerDisplaySeconds() {
  const state = useAppState();
  const now = useNow();
  const activeCalendarEvent = useActiveCalendarEvent();
  const sessionSeconds = useSessionSeconds();
  const derivedElapsedSeconds = getDerivedElapsedSeconds(state, now);

  if (activeCalendarEvent) {
    return Math.max(0, getCalendarEventDurationSeconds(activeCalendarEvent) - sessionSeconds);
  }

  if (state.timerMode === "pomodoro") {
    return Math.max(0, state.timerTotalSeconds - derivedElapsedSeconds);
  }

  return sessionSeconds;
}

export function useCompletedTasksCount() {
  const state = useAppState();
  const tasks = useLiveTasks();
  return getCompletedTasksForDay(tasks, state.currentDayKey).length;
}

export function useCompletedHabitsCount() {
  const state = useAppState();
  return state.habits.filter((habit) => habit.checked).length;
}

export function useTodayDateLabel() {
  const currentDayKey = useExecutionStore((store) => store.state.currentDayKey);
  return useMemo(() => formatDateLabel(new Date(), { weekday: "long", day: "numeric", month: "long" }), [currentDayKey]);
}

export function useCurrentMonthLabel() {
  const currentDayKey = useExecutionStore((store) => store.state.currentDayKey);
  return useMemo(() => formatDateLabel(new Date(), { month: "long", year: "numeric" }), [currentDayKey]);
}

export function useWeeklyPoints(): WeeklyPoint[] {
  const state = useAppState();
  const derivedFocusElapsedSeconds = useDerivedFocusElapsedSeconds();

  return useMemo(() => {
    const points: WeeklyPoint[] = [];

    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);

      const dayKey = getDayKey(date);
      const snapshot = dayKey === state.currentDayKey ? buildSnapshot(state, derivedFocusElapsedSeconds) : state.dailySnapshots[dayKey];
      const focusMinutes = Math.round((snapshot?.focusSeconds ?? 0) / 60);
      const won = Boolean(snapshot && isSnapshotWon(snapshot));

      points.push({
        day: formatDateLabel(date, { weekday: "short" }),
        focus: focusMinutes,
        won,
      });
    }

    return points;
  }, [derivedFocusElapsedSeconds, state]);
}

export function useDaysWon() {
  const state = useAppState();
  const derivedFocusElapsedSeconds = useDerivedFocusElapsedSeconds();

  return useMemo(() => {
    const weeklySnapshots: DailySnapshot[] = [];

    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      const snapshot = state.dailySnapshots[getDayKey(date)];
      if (snapshot) {
        weeklySnapshots.push(snapshot);
      }
    }

    const combined = weeklySnapshots
      .concat(buildSnapshot(state, derivedFocusElapsedSeconds))
      .filter((item, index, array) => array.findIndex((candidate) => candidate.dayKey === item.dayKey) === index);

    return getDaysWonCount(combined);
  }, [derivedFocusElapsedSeconds, state]);
}

export function useWeeklyFocusMinutes() {
  const weeklyPoints = useWeeklyPoints();
  return weeklyPoints.reduce((sum, item) => sum + item.focus, 0);
}

export function useMonthlyFocusMinutes() {
  const state = useAppState();
  const derivedFocusElapsedSeconds = useDerivedFocusElapsedSeconds();

  return useMemo(() => {
    const currentMonthKey = state.currentDayKey.slice(0, 7);
    const archivedMonthSeconds = Object.entries(state.dailySnapshots).reduce((sum, [dayKey, snapshot]) => {
      if (dayKey === state.currentDayKey || !dayKey.startsWith(currentMonthKey)) {
        return sum;
      }

      return sum + snapshot.focusSeconds;
    }, 0);

    return Math.round((archivedMonthSeconds + buildSnapshot(state, derivedFocusElapsedSeconds).focusSeconds) / 60);
  }, [derivedFocusElapsedSeconds, state]);
}

export function useHistoryEntries() {
  const dailyHistory = useExecutionStore((store) => store.state.dailyHistory);
  return useMemo(
    () => Object.values(dailyHistory).sort((left, right) => right.dayKey.localeCompare(left.dayKey)),
    [dailyHistory],
  );
}

// Today's agenda: calendar events occurring today, sorted by start time.
export function useTodayAgenda() {
  const state = useAppState();

  return useMemo(() => {
    const todayKey = state.currentDayKey;
    return state.calendarEvents
      .filter((event) => isCalendarEventOnDay(event, todayKey))
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
  }, [state.calendarEvents, state.currentDayKey]);
}

// Agenda events with a focus session logged today count as done.
export function useCompletedAgendaIds() {
  const state = useAppState();

  return useMemo(() => {
    const todayKey = state.currentDayKey;
    const ids = new Set<string>();
    for (const session of state.focusSessions) {
      if (getDayKey(new Date(session.endedAt)) === todayKey) {
        ids.add(session.taskId);
      }
    }
    return ids;
  }, [state.focusSessions, state.currentDayKey]);
}

export function useDayOutcomeByKey() {
  const state = useAppState();
  const derivedFocusElapsedSeconds = useDerivedFocusElapsedSeconds();

  return useMemo(() => {
    const outcomes = new Map<string, { hasData: boolean; won: boolean }>();

    for (const [dayKey, snapshot] of Object.entries(state.dailySnapshots)) {
      outcomes.set(dayKey, { hasData: true, won: isSnapshotWon(snapshot) });
    }

    const todaySnapshot = buildSnapshot(state, derivedFocusElapsedSeconds);
    outcomes.set(state.currentDayKey, {
      hasData: todaySnapshot.focusSeconds > 0 || todaySnapshot.completedHabits > 0 || todaySnapshot.completedTasks > 0,
      won: isSnapshotWon(todaySnapshot),
    });

    return outcomes;
  }, [derivedFocusElapsedSeconds, state]);
}
