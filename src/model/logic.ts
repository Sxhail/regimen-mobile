import { getDayKey } from "./defaults";
import { dayKeyToDate, diffCalendarDays, timeValueToMinutes } from "./time";
import type {
  AppState,
  CalendarBlock,
  CalendarEvent,
  DailyHistoryEntry,
  DailyHistoryTask,
  DailySnapshot,
  PomodoroConfig,
  PomodoroPhase,
  Task,
  TaskGroup,
  TimerAlert,
} from "./types";

export function getCompletedTasksForDay(tasks: Task[], dayKey: string) {
  return tasks.filter((task) => task.completed && task.completedDayKey === dayKey);
}

export function buildDailyHistoryTasks(state: AppState): DailyHistoryTask[] {
  return getCompletedTasksForDay(state.tasks, state.currentDayKey).map((task) => ({
    id: task.id,
    groupId: task.groupId,
    groupTitle: state.taskGroups.find((group) => group.id === task.groupId)?.title ?? "Unknown",
    title: task.title,
    secondsSpent: task.secondsSpent,
    completedDayKey: task.completedDayKey,
  }));
}

export function buildSnapshot(state: AppState, elapsedSeconds = 0): DailySnapshot {
  return {
    dayKey: state.currentDayKey,
    focusSeconds: state.todayFocusSeconds + elapsedSeconds,
    completedTasks: getCompletedTasksForDay(state.tasks, state.currentDayKey).length,
    completedHabits: state.habits.filter((habit) => habit.checked).length,
    totalHabits: state.habits.length,
  };
}

export function buildDailyHistoryEntry(state: AppState, capturedAt = Date.now(), elapsedSeconds = 0): DailyHistoryEntry {
  return {
    dayKey: state.currentDayKey,
    capturedAt,
    hardestTask: state.hardestTask,
    firstStep: state.firstStep,
    journal: state.journal,
    monthlyJournal: state.monthlyJournal,
    tasks: buildDailyHistoryTasks(state),
    habits: state.habits.map((habit) => ({ ...habit })),
    metrics: state.metrics.map((metric) => ({ ...metric })),
    goals: {
      vision: state.goals.vision.map((goal) => ({ ...goal })),
      month: state.goals.month.map((goal) => ({ ...goal })),
      today: state.goals.today.map((goal) => ({ ...goal })),
    },
    snapshot: buildSnapshot(state, elapsedSeconds),
  };
}

export function normalizePomodoroConfig(config?: Partial<PomodoroConfig>): PomodoroConfig {
  return {
    workMinutes: config?.workMinutes ?? 25,
    breakMinutes: config?.breakMinutes ?? 5,
    rounds: config?.rounds ?? 4,
  };
}

export function createTimerAlert(title: string, message: string): TimerAlert {
  return {
    id: Date.now(),
    title,
    message,
  };
}

export function getPomodoroDurationSeconds(config: PomodoroConfig, phase: PomodoroPhase) {
  if (phase === "focus") {
    return config.workMinutes * 60;
  }

  return config.breakMinutes * 60;
}

export function resetDailyFields(state: AppState, nextDayKey: string): AppState {
  return {
    ...state,
    activeTaskId: null,
    activeCalendarEventId: null,
    isRunning: false,
    runningSince: null,
    sessionSeconds: 0,
    todayFocusSeconds: 0,
    timerTotalSeconds: getPomodoroDurationSeconds(state.pomodoroConfig, "focus"),
    timerAlert: null,
    pomodoroPhase: "focus",
    pomodoroCompletedFocusBlocks: 0,
    hardestTask: "",
    firstStep: "",
    journal: "",
    habits: state.habits.map((habit) => ({ ...habit, checked: false })),
    metrics: state.metrics.map((metric) => ({ ...metric, value: "" })),
    currentDayKey: nextDayKey,
    showFloatingTimer: false,
    timerExpanded: false,
  };
}

export function withCommittedElapsed(state: AppState, endedAt = Date.now()): AppState {
  if (!state.isRunning || !state.runningSince) {
    return state;
  }

  const elapsedSeconds = Math.max(0, Math.floor((endedAt - state.runningSince) / 1000));
  if (!elapsedSeconds) {
    return { ...state, isRunning: false, runningSince: null };
  }

  const activeCalendarEvent = state.calendarEvents.find((event) => event.id === state.activeCalendarEventId);
  if (activeCalendarEvent) {
    const focusSessions = [
      {
        id: `session-${endedAt}`,
        taskId: activeCalendarEvent.id,
        taskTitle: activeCalendarEvent.title,
        durationSeconds: elapsedSeconds,
        startedAt: endedAt - elapsedSeconds * 1000,
        endedAt,
      },
      ...state.focusSessions,
    ];

    return {
      ...state,
      isRunning: false,
      runningSince: null,
      sessionSeconds: state.sessionSeconds + elapsedSeconds,
      todayFocusSeconds: state.todayFocusSeconds + elapsedSeconds,
      focusSessions,
    };
  }

  if (state.timerMode === "pomodoro") {
    const committedSeconds = Math.min(elapsedSeconds, state.timerTotalSeconds);
    const remainingSeconds = Math.max(0, state.timerTotalSeconds - committedSeconds);
    const isFocusPhase = state.pomodoroPhase === "focus";
    const activeTask = state.tasks.find((task) => task.id === state.activeTaskId);
    const focusSessions = isFocusPhase && activeTask && committedSeconds > 0
      ? [
          {
            id: `session-${endedAt}`,
            taskId: activeTask.id,
            taskTitle: activeTask.title,
            durationSeconds: committedSeconds,
            startedAt: endedAt - committedSeconds * 1000,
            endedAt,
          },
          ...state.focusSessions,
        ]
      : state.focusSessions;

    return {
      ...state,
      isRunning: false,
      runningSince: null,
      timerTotalSeconds: remainingSeconds,
      sessionSeconds: isFocusPhase ? state.sessionSeconds + committedSeconds : state.sessionSeconds,
      todayFocusSeconds: isFocusPhase ? state.todayFocusSeconds + committedSeconds : state.todayFocusSeconds,
      tasks: isFocusPhase && state.activeTaskId
        ? state.tasks.map((task) => (task.id === state.activeTaskId ? { ...task, secondsSpent: task.secondsSpent + committedSeconds } : task))
        : state.tasks,
      focusSessions,
    };
  }

  const activeTask = state.tasks.find((task) => task.id === state.activeTaskId);
  const focusSessions = activeTask
    ? [
        {
          id: `session-${endedAt}`,
          taskId: activeTask.id,
          taskTitle: activeTask.title,
          durationSeconds: elapsedSeconds,
          startedAt: endedAt - elapsedSeconds * 1000,
          endedAt,
        },
        ...state.focusSessions,
      ]
    : state.focusSessions;

  return {
    ...state,
    isRunning: false,
    runningSince: null,
    sessionSeconds: state.sessionSeconds + elapsedSeconds,
    todayFocusSeconds: state.todayFocusSeconds + elapsedSeconds,
    tasks: state.activeTaskId
      ? state.tasks.map((task) => (task.id === state.activeTaskId ? { ...task, secondsSpent: task.secondsSpent + elapsedSeconds } : task))
      : state.tasks,
    focusSessions,
  };
}

export function getDerivedElapsedSeconds(state: AppState, now: number) {
  if (!state.isRunning || !state.runningSince) {
    return 0;
  }

  return Math.max(0, Math.floor((now - state.runningSince) / 1000));
}

export function isSnapshotWon(snapshot: DailySnapshot) {
  const totalHabits = snapshot.totalHabits ?? 0;
  return snapshot.focusSeconds > 0 && (totalHabits > 0 ? snapshot.completedHabits === totalHabits : snapshot.completedTasks > 0);
}

export function getDaysWonCount(snapshots: DailySnapshot[]) {
  return snapshots.filter((item) => isSnapshotWon(item)).length;
}

export function createTaskGroup(title: string): TaskGroup {
  return {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
  };
}

// Single recurrence implementation (the web app had three parallel copies).
export function isCalendarEventOnDay(event: CalendarEvent, dayKey: string) {
  if (dayKey < event.startDayKey) {
    return false;
  }

  if (event.repeatEndDayKey && dayKey > event.repeatEndDayKey) {
    return false;
  }

  if (event.repeat === "none") {
    return dayKey >= event.startDayKey && dayKey <= event.endDayKey;
  }

  const day = dayKeyToDate(dayKey);
  const start = dayKeyToDate(event.startDayKey);

  if (event.repeat === "daily") {
    return true;
  }

  if (event.repeat === "weekly") {
    return day.getDay() === start.getDay() && diffCalendarDays(dayKey, event.startDayKey) % 7 === 0;
  }

  if (event.repeat === "monthly") {
    return day.getDate() === start.getDate();
  }

  return day.getMonth() === start.getMonth() && day.getDate() === start.getDate();
}

export function getCalendarEventWindow(event: CalendarEvent, timestamp: number) {
  const date = new Date(timestamp);
  const dayKey = getDayKey(date);

  if (!isCalendarEventOnDay(event, dayKey)) {
    return null;
  }

  const start = dayKeyToDate(dayKey);
  start.setMinutes(timeValueToMinutes(event.startTime));

  const end = dayKeyToDate(dayKey);
  end.setMinutes(Math.max(timeValueToMinutes(event.startTime) + 15, timeValueToMinutes(event.endTime)));

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

export function getCalendarEventDurationSeconds(event: CalendarEvent) {
  const startMinutes = timeValueToMinutes(event.startTime);
  const endMinutes = Math.max(startMinutes + 15, timeValueToMinutes(event.endTime));

  return (endMinutes - startMinutes) * 60;
}

export function createCalendarEvent(input: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): CalendarEvent {
  const timestamp = Date.now();

  return {
    ...input,
    id: `event-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createCalendarBlock(input: Omit<CalendarBlock, "id" | "createdAt" | "updatedAt">): CalendarBlock {
  const timestamp = Date.now();

  return {
    ...input,
    id: `block-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function advancePomodoroPhase(state: AppState, advancedAt = Date.now()): AppState {
  if (state.timerMode !== "pomodoro" || !state.runningSince) {
    return state;
  }

  const pomodoroConfig = normalizePomodoroConfig(state.pomodoroConfig);
  const phaseDuration = Math.max(1, state.timerTotalSeconds);
  const committed = withCommittedElapsed({ ...state, pomodoroConfig }, state.runningSince + phaseDuration * 1000);

  if (state.pomodoroPhase === "focus") {
    const completedFocusBlocks = committed.pomodoroCompletedFocusBlocks + 1;
    const completedCycle = completedFocusBlocks >= pomodoroConfig.rounds;
    const shouldRunBreak = !completedCycle && pomodoroConfig.breakMinutes > 0;

    if (shouldRunBreak) {
      return {
        ...committed,
        pomodoroConfig,
        isRunning: true,
        runningSince: advancedAt,
        pomodoroPhase: "break",
        pomodoroCompletedFocusBlocks: completedFocusBlocks,
        timerTotalSeconds: getPomodoroDurationSeconds(pomodoroConfig, "break"),
        timerAlert: createTimerAlert(
          `Round ${completedFocusBlocks} complete`,
          `Focus round ${completedFocusBlocks} of ${pomodoroConfig.rounds} finished. Break started for ${pomodoroConfig.breakMinutes} minute${pomodoroConfig.breakMinutes === 1 ? "" : "s"}.`,
        ),
        showFloatingTimer: true,
      };
    }

    if (!completedCycle) {
      return {
        ...committed,
        pomodoroConfig,
        isRunning: true,
        runningSince: advancedAt,
        pomodoroPhase: "focus",
        pomodoroCompletedFocusBlocks: completedFocusBlocks,
        timerTotalSeconds: getPomodoroDurationSeconds(pomodoroConfig, "focus"),
        timerAlert: createTimerAlert(
          `Round ${completedFocusBlocks} complete`,
          `Focus round ${completedFocusBlocks} of ${pomodoroConfig.rounds} finished. Next focus round started immediately because break minutes is set to 0.`,
        ),
        showFloatingTimer: true,
      };
    }

    return {
      ...committed,
      pomodoroConfig,
      isRunning: false,
      runningSince: null,
      pomodoroPhase: "focus",
      pomodoroCompletedFocusBlocks: completedFocusBlocks,
      timerTotalSeconds: getPomodoroDurationSeconds(pomodoroConfig, "focus"),
      timerAlert: createTimerAlert(
        "Pomodoro cycle complete",
        `${completedFocusBlocks} of ${pomodoroConfig.rounds} focus rounds finished. Start the next cycle when you're ready.`,
      ),
      showFloatingTimer: true,
    };
  }

  return {
    ...committed,
    pomodoroConfig,
    isRunning: true,
    runningSince: advancedAt,
    pomodoroPhase: "focus",
    timerTotalSeconds: getPomodoroDurationSeconds(pomodoroConfig, "focus"),
    timerAlert: createTimerAlert(
      "Break complete",
      `Break finished. Focus round ${Math.min(committed.pomodoroCompletedFocusBlocks + 1, pomodoroConfig.rounds)} of ${pomodoroConfig.rounds} is starting now.`,
    ),
    showFloatingTimer: true,
  };
}

export function archiveDay(state: AppState, nextDayKey: string, timestamp = Date.now()): AppState {
  const committed = withCommittedElapsed(state, timestamp);

  return {
    ...resetDailyFields(committed, nextDayKey),
    dailySnapshots: {
      ...committed.dailySnapshots,
      [state.currentDayKey]: buildSnapshot(committed),
    },
    dailyHistory: {
      ...committed.dailyHistory,
      [state.currentDayKey]: buildDailyHistoryEntry(committed, timestamp),
    },
  };
}
