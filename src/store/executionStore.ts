import { create } from "zustand";

import { createInitialState, getDayKey } from "../model/defaults";
import {
  advancePomodoroPhase,
  archiveDay,
  createCalendarBlock,
  createCalendarEvent,
  createTaskGroup,
  getPomodoroDurationSeconds,
  normalizePomodoroConfig,
  withCommittedElapsed,
} from "../model/logic";
import { loadStoredDayModules, loadStoredState, storeDayModules, storeState } from "../model/storage";
import {
  cancelPomodoroPhaseEndNotifications,
  schedulePomodoroPhaseEndNotification,
} from "../runtime/notifications";
import type {
  AccentKey,
  AppState,
  CalendarBlock,
  CalendarEvent,
  FontStyleId,
  GoalBucketKey,
  GoalDraft,
  MetricField,
  MetricType,
  PomodoroConfig,
  PromptSet,
  TaskKanbanStatus,
  ThemeMode,
  TimerMode,
} from "../model/types";
import { minutesToTimeValue, timeValueToMinutes } from "../model/time";

export const DAY_MODULE_IDS = ["agenda", "next", "inProgress", "goals", "habits", "stats", "principles", "inputs"] as const;
export type DayModuleId = (typeof DAY_MODULE_IDS)[number];

type ExecutionStore = {
  state: AppState;
  hydrated: boolean;
  now: number;
  dayModules: DayModuleId[];

  hydrate: () => Promise<void>;
  replaceStateFromCloud: (state: AppState, dayModules?: DayModuleId[]) => void;
  setNow: (timestamp: number) => void;
  checkDayRollover: () => void;
  maybeAdvancePomodoro: () => void;

  toggleDayModule: (module: DayModuleId) => void;

  startTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  saveTaskEdit: (taskId: string, title: string) => void;
  addTask: (groupId: string | undefined, title: string) => void;
  updateTaskNotes: (taskId: string, notes: string) => void;
  updateTaskKanbanStatus: (taskId: string, kanbanStatus: TaskKanbanStatus) => void;

  addTaskGroup: (title: string) => void;
  saveTaskGroupEdit: (groupId: string, title: string) => void;
  deleteTaskGroup: (groupId: string) => void;

  toggleHabit: (habitId: string) => void;
  addHabit: (label: string) => void;
  saveHabitEdit: (habitId: string, label: string) => void;
  deleteHabit: (habitId: string) => void;

  addMetric: (label: string, type: MetricType) => void;
  updateMetric: (id: string, key: keyof MetricField, value: string) => void;
  removeMetric: (id: string) => void;

  addPrompt: (type: keyof PromptSet, prompt: string) => void;
  removePrompt: (type: keyof PromptSet, prompt: string) => void;

  updateGoalDraft: (bucket: GoalBucketKey, key: keyof GoalDraft, value: string) => void;
  addGoal: (bucket: GoalBucketKey) => void;
  removeGoal: (bucket: GoalBucketKey, id: string) => void;
  updatePrincipleDraft: (key: keyof GoalDraft, value: string) => void;
  addPrinciple: () => void;
  removePrinciple: (id: string) => void;

  setHardestTask: (value: string) => void;
  setFirstStep: (value: string) => void;
  setJournal: (value: string) => void;
  setMonthlyJournal: (value: string) => void;

  startFocus: () => void;
  startCalendarEvent: (eventId: string) => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  resetToday: () => void;
  setTimerMode: (value: TimerMode) => void;
  updatePomodoroConfig: (key: keyof PomodoroConfig, value: number) => void;
  dismissTimerAlert: () => void;
  setShowFloatingTimer: (value: boolean) => void;
  setTimerExpanded: (value: boolean) => void;

  setCompactMode: (value: boolean) => void;
  setAccent: (value: AccentKey) => void;
  setThemeMode: (value: ThemeMode) => void;
  setFontStyle: (value: FontStyleId) => void;

  addCalendarEvent: (event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => void;
  addCalendarEvents: (events: Array<Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">>) => void;
  updateCalendarEvent: (eventId: string, patch: Partial<Omit<CalendarEvent, "id" | "createdAt">>) => void;
  deleteCalendarEvent: (eventId: string) => void;
  rescheduleCalendarEvent: (eventId: string, startDayKey: string, startTime: string) => void;
  addCalendarBlock: (block: Omit<CalendarBlock, "id" | "createdAt" | "updatedAt">) => void;
  deleteCalendarBlock: (blockId: string) => void;
};

function normalizeDayModules(raw: string | null): DayModuleId[] {
  if (!raw) {
    return [...DAY_MODULE_IDS];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DAY_MODULE_IDS];
    }

    const filtered = parsed.filter((item): item is DayModuleId => DAY_MODULE_IDS.includes(item as DayModuleId));
    return filtered.length > 0 ? filtered : [...DAY_MODULE_IDS];
  } catch {
    return [...DAY_MODULE_IDS];
  }
}

export const useExecutionStore = create<ExecutionStore>((set, get) => {
  const update = (updater: (current: AppState) => AppState) => {
    set((store) => ({ state: updater(store.state) }));
  };

  return {
    state: createInitialState(),
    hydrated: false,
    now: Date.now(),
    dayModules: [...DAY_MODULE_IDS],

    hydrate: async () => {
      try {
        const [loadedState, rawModules] = await Promise.all([
          loadStoredState(),
          loadStoredDayModules(),
        ]);
        const todayKey = getDayKey();
        const normalizedLoadedState = {
          ...loadedState,
          pomodoroConfig: normalizePomodoroConfig(loadedState.pomodoroConfig),
        };

        const nextState = normalizedLoadedState.currentDayKey !== todayKey
          ? archiveDay(normalizedLoadedState, todayKey)
          : normalizedLoadedState;

        set({ state: nextState, dayModules: normalizeDayModules(rawModules), hydrated: true, now: Date.now() });
      } catch {
        set({ state: createInitialState(), hydrated: true, now: Date.now() });
      }
    },

    replaceStateFromCloud: (cloudState, cloudDayModules) => {
      const todayKey = getDayKey();
      const normalizedCloudState = {
        ...cloudState,
        pomodoroConfig: normalizePomodoroConfig(cloudState.pomodoroConfig),
      };
      const nextState = normalizedCloudState.currentDayKey !== todayKey
        ? archiveDay(normalizedCloudState, todayKey)
        : normalizedCloudState;

      set({
        state: nextState,
        dayModules: cloudDayModules ?? get().dayModules,
        hydrated: true,
        now: Date.now(),
      });
    },

    setNow: (timestamp) => set({ now: timestamp }),

    checkDayRollover: () => {
      const todayKey = getDayKey();
      if (todayKey === get().state.currentDayKey) {
        return;
      }

      update((current) => archiveDay(current, todayKey));
    },

    maybeAdvancePomodoro: () => {
      const { state, now } = get();
      if (!state.isRunning || !state.runningSince || state.activeCalendarEventId || state.timerMode !== "pomodoro") {
        return;
      }

      const elapsed = Math.max(0, Math.floor((now - state.runningSince) / 1000));
      if (elapsed < state.timerTotalSeconds) {
        return;
      }

      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => advancePomodoroPhase(current, timestamp));
    },

    toggleDayModule: (module) => {
      set((store) => {
        const active = store.dayModules.includes(module);
        const next = active ? store.dayModules.filter((item) => item !== module) : [...store.dayModules, module];
        return { dayModules: next.length > 0 ? next : store.dayModules };
      });
    },

    startTask: (taskId) => {
      const { state } = get();
      const nextTask = state.tasks.find((item) => item.id === taskId);
      if (!nextTask || nextTask.completed) {
        return;
      }

      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => {
        const shouldCommitCurrent = Boolean((current.activeTaskId && current.activeTaskId !== taskId) || current.activeCalendarEventId);
        const committed = shouldCommitCurrent ? withCommittedElapsed(current, timestamp) : current;
        const isPomodoro = committed.timerMode === "pomodoro";
        const normalizedConfig = normalizePomodoroConfig(committed.pomodoroConfig);
        const shouldResumePomodoro = isPomodoro && committed.activeTaskId === taskId && committed.pomodoroPhase === "focus" && committed.timerTotalSeconds > 0;

        return {
          ...committed,
          pomodoroConfig: normalizedConfig,
          activeTaskId: taskId,
          activeCalendarEventId: null,
          isRunning: true,
          runningSince: timestamp,
          sessionSeconds: committed.activeTaskId === taskId ? committed.sessionSeconds : 0,
          pomodoroPhase: isPomodoro ? "focus" : committed.pomodoroPhase,
          timerTotalSeconds: isPomodoro
            ? shouldResumePomodoro
              ? committed.timerTotalSeconds
              : getPomodoroDurationSeconds(normalizedConfig, "focus")
            : committed.timerTotalSeconds,
          timerAlert: null,
          showFloatingTimer: true,
          tasks: committed.tasks.map((task) =>
            task.id === taskId && task.kanbanStatus === "backlog"
              ? { ...task, kanbanStatus: "in_progress" as const }
              : task,
          ),
        };
      });
    },

    completeTask: (taskId) => {
      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => {
        const committed = current.activeTaskId === taskId ? withCommittedElapsed(current, timestamp) : current;
        return {
          ...committed,
          tasks: committed.tasks.map((task) => (task.id === taskId ? { ...task, completed: true, completedDayKey: current.currentDayKey, kanbanStatus: "done" as const } : task)),
          activeTaskId: current.activeTaskId === taskId ? null : committed.activeTaskId,
          sessionSeconds: current.activeTaskId === taskId ? 0 : committed.sessionSeconds,
          showFloatingTimer: current.activeTaskId === taskId ? false : committed.showFloatingTimer,
        };
      });
    },

    deleteTask: (taskId) => {
      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => {
        const committed = current.activeTaskId === taskId ? withCommittedElapsed(current, timestamp) : current;
        return {
          ...committed,
          tasks: committed.tasks.filter((task) => task.id !== taskId),
          activeTaskId: committed.activeTaskId === taskId ? null : committed.activeTaskId,
          sessionSeconds: committed.activeTaskId === taskId ? 0 : committed.sessionSeconds,
        };
      });
    },

    saveTaskEdit: (taskId, title) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }

      update((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, title: trimmed } : task)),
      }));
    },

    addTask: (groupId, title) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }

      update((current) => {
        let nextTaskGroups = current.taskGroups;
        let resolvedGroupId = groupId;

        if (!resolvedGroupId) {
          if (nextTaskGroups.length === 0) {
            const generalGroup = createTaskGroup("General");
            nextTaskGroups = [generalGroup];
            resolvedGroupId = generalGroup.id;
          } else {
            resolvedGroupId = nextTaskGroups[0].id;
          }
        }

        return {
          ...current,
          taskGroups: nextTaskGroups,
          tasks: [...current.tasks, { id: `task-${Date.now()}`, groupId: resolvedGroupId, title: trimmed, completed: false, completedDayKey: null, secondsSpent: 0, notes: "", kanbanStatus: "backlog" as const }],
        };
      });
    },

    updateTaskNotes: (taskId, notes) => {
      update((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, notes } : task)),
      }));
    },

    updateTaskKanbanStatus: (taskId, kanbanStatus) => {
      update((current) => ({
        ...current,
        tasks: current.tasks.map((task) => {
          if (task.id !== taskId) {
            return task;
          }

          if (kanbanStatus === "done") {
            return { ...task, kanbanStatus, completed: true, completedDayKey: current.currentDayKey };
          }

          return { ...task, kanbanStatus, completed: false, completedDayKey: null };
        }),
      }));
    },

    addTaskGroup: (title) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }

      const group = createTaskGroup(trimmed);
      update((current) => ({
        ...current,
        taskGroups: [...current.taskGroups, group],
      }));
    },

    saveTaskGroupEdit: (groupId, title) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }

      update((current) => ({
        ...current,
        taskGroups: current.taskGroups.map((group) => (group.id === groupId ? { ...group, title: trimmed } : group)),
      }));
    },

    deleteTaskGroup: (groupId) => {
      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => {
        const groupTaskIds = current.tasks.filter((task) => task.groupId === groupId).map((task) => task.id);
        const activeTaskInGroup = current.activeTaskId ? groupTaskIds.includes(current.activeTaskId) : false;
        const committed = activeTaskInGroup ? withCommittedElapsed(current, timestamp) : current;

        return {
          ...committed,
          taskGroups: committed.taskGroups.filter((group) => group.id !== groupId),
          tasks: committed.tasks.filter((task) => task.groupId !== groupId),
          activeTaskId: activeTaskInGroup ? null : committed.activeTaskId,
          sessionSeconds: activeTaskInGroup ? 0 : committed.sessionSeconds,
        };
      });
    },

    toggleHabit: (habitId) => {
      update((current) => ({
        ...current,
        habits: current.habits.map((habit) => (habit.id === habitId ? { ...habit, checked: !habit.checked } : habit)),
      }));
    },

    addHabit: (label) => {
      const trimmed = label.trim();
      if (!trimmed) {
        return;
      }

      update((current) => ({
        ...current,
        habits: [...current.habits, { id: `habit-${Date.now()}`, label: trimmed, checked: false }],
      }));
    },

    saveHabitEdit: (habitId, label) => {
      const trimmed = label.trim();
      if (!trimmed) {
        return;
      }

      update((current) => ({
        ...current,
        habits: current.habits.map((habit) => (habit.id === habitId ? { ...habit, label: trimmed } : habit)),
      }));
    },

    deleteHabit: (habitId) => {
      update((current) => ({
        ...current,
        habits: current.habits.filter((habit) => habit.id !== habitId),
      }));
    },

    addMetric: (label, type) => {
      const trimmed = label.trim();
      if (!trimmed) {
        return;
      }

      update((current) => ({
        ...current,
        metrics: [...current.metrics, { id: `metric-${Date.now()}`, label: trimmed, type, value: "", target: "" }],
      }));
    },

    updateMetric: (id, key, value) => {
      update((current) => ({
        ...current,
        metrics: current.metrics.map((metric) => (metric.id === id ? { ...metric, [key]: value } : metric)),
      }));
    },

    removeMetric: (id) => {
      update((current) => ({
        ...current,
        metrics: current.metrics.filter((metric) => metric.id !== id),
      }));
    },

    addPrompt: (type, prompt) => {
      const candidate = prompt.trim();
      if (!candidate) {
        return;
      }

      update((current) => ({
        ...current,
        prompts: { ...current.prompts, [type]: [...current.prompts[type], candidate] },
      }));
    },

    removePrompt: (type, prompt) => {
      update((current) => ({
        ...current,
        prompts: { ...current.prompts, [type]: current.prompts[type].filter((item) => item !== prompt) },
      }));
    },

    updateGoalDraft: (bucket, key, value) => {
      update((current) => ({
        ...current,
        goalDrafts: { ...current.goalDrafts, [bucket]: { ...current.goalDrafts[bucket], [key]: value } },
      }));
    },

    addGoal: (bucket) => {
      update((current) => {
        const draft = current.goalDrafts[bucket];
        if (!draft.title.trim()) {
          return current;
        }

        return {
          ...current,
          goals: {
            ...current.goals,
            [bucket]: [...current.goals[bucket], { id: `goal-${bucket}-${Date.now()}`, title: draft.title.trim(), note: draft.note.trim() }],
          },
          goalDrafts: { ...current.goalDrafts, [bucket]: { title: "", note: "" } },
        };
      });
    },

    removeGoal: (bucket, id) => {
      update((current) => ({
        ...current,
        goals: { ...current.goals, [bucket]: current.goals[bucket].filter((goal) => goal.id !== id) },
      }));
    },

    updatePrincipleDraft: (key, value) => {
      update((current) => ({
        ...current,
        principleDraft: { ...current.principleDraft, [key]: value },
      }));
    },

    addPrinciple: () => {
      update((current) => {
        const title = current.principleDraft.title.trim();
        if (!title) {
          return current;
        }

        return {
          ...current,
          principles: [
            ...current.principles,
            {
              id: `principle-${Date.now()}`,
              title,
              note: current.principleDraft.note.trim(),
            },
          ],
          principleDraft: { title: "", note: "" },
        };
      });
    },

    removePrinciple: (id) => {
      update((current) => ({
        ...current,
        principles: current.principles.filter((principle) => principle.id !== id),
      }));
    },

    setHardestTask: (value) => update((current) => ({ ...current, hardestTask: value })),
    setFirstStep: (value) => update((current) => ({ ...current, firstStep: value })),
    setJournal: (value) => update((current) => ({ ...current, journal: value })),
    setMonthlyJournal: (value) => update((current) => ({ ...current, monthlyJournal: value })),

    startFocus: () => {
      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => {
        if (current.timerMode === "pomodoro") {
          const normalizedConfig = normalizePomodoroConfig(current.pomodoroConfig);
          const shouldResetCycle = current.pomodoroCompletedFocusBlocks >= normalizedConfig.rounds && current.pomodoroPhase === "focus";

          return {
            ...current,
            pomodoroConfig: normalizedConfig,
            isRunning: true,
            runningSince: timestamp,
            pomodoroPhase: shouldResetCycle ? "focus" : current.pomodoroPhase,
            pomodoroCompletedFocusBlocks: shouldResetCycle ? 0 : current.pomodoroCompletedFocusBlocks,
            timerTotalSeconds: shouldResetCycle
              ? getPomodoroDurationSeconds(normalizedConfig, "focus")
              : current.timerTotalSeconds,
            timerAlert: null,
            showFloatingTimer: true,
          };
        }

        return {
          ...current,
          isRunning: true,
          runningSince: timestamp,
          showFloatingTimer: true,
        };
      });
    },

    startCalendarEvent: (eventId) => {
      const { state } = get();
      const event = state.calendarEvents.find((item) => item.id === eventId);
      if (!event) {
        return;
      }

      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => {
        const shouldCommitCurrent = Boolean(current.activeTaskId || current.activeCalendarEventId);
        const committed = shouldCommitCurrent ? withCommittedElapsed(current, timestamp) : current;

        return {
          ...committed,
          activeTaskId: null,
          activeCalendarEventId: eventId,
          isRunning: true,
          runningSince: timestamp,
          sessionSeconds: committed.activeCalendarEventId === eventId ? committed.sessionSeconds : 0,
          timerAlert: null,
          showFloatingTimer: true,
        };
      });
    },

    pauseTimer: () => {
      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => withCommittedElapsed(current, timestamp));
    },

    stopTimer: () => {
      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => {
        const committed = withCommittedElapsed(current, timestamp);
        const normalizedConfig = normalizePomodoroConfig(committed.pomodoroConfig);
        return {
          ...committed,
          activeTaskId: null,
          activeCalendarEventId: null,
          sessionSeconds: 0,
          pomodoroConfig: normalizedConfig,
          timerTotalSeconds: getPomodoroDurationSeconds(normalizedConfig, "focus"),
          timerAlert: null,
          pomodoroPhase: "focus",
          pomodoroCompletedFocusBlocks: 0,
          showFloatingTimer: false,
        };
      });
    },

    resetToday: () => {
      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => ({
        ...archiveDay(current, current.currentDayKey, timestamp),
        showFloatingTimer: false,
      }));
    },

    setTimerMode: (value) => {
      update((current) => ({
        ...current,
        pomodoroConfig: normalizePomodoroConfig(current.pomodoroConfig),
        timerMode: value,
        timerAlert: null,
        pomodoroPhase: "focus",
        pomodoroCompletedFocusBlocks: value === "pomodoro" ? current.pomodoroCompletedFocusBlocks : 0,
        timerTotalSeconds: value === "pomodoro" ? getPomodoroDurationSeconds(normalizePomodoroConfig(current.pomodoroConfig), "focus") : current.timerTotalSeconds,
      }));
    },

    updatePomodoroConfig: (key, value) => {
      update((current) => {
        const currentConfig = normalizePomodoroConfig(current.pomodoroConfig);
        const fallbackValue = currentConfig[key];
        const normalizedValue = key === "workMinutes"
          ? Math.max(1, Math.min(180, Math.floor(Number.isFinite(value) ? value : fallbackValue)))
          : key === "breakMinutes"
            ? Math.max(0, Math.min(60, Math.floor(Number.isFinite(value) ? value : fallbackValue)))
            : Math.max(1, Math.min(12, Math.floor(Number.isFinite(value) ? value : fallbackValue)));
        const pomodoroConfig = { ...currentConfig, [key]: normalizedValue };

        return {
          ...current,
          pomodoroConfig,
          timerTotalSeconds: current.timerMode === "pomodoro" && !current.isRunning
            ? getPomodoroDurationSeconds(pomodoroConfig, current.pomodoroPhase)
            : current.timerTotalSeconds,
        };
      });
    },

    dismissTimerAlert: () => update((current) => ({ ...current, timerAlert: null })),
    setShowFloatingTimer: (value) => update((current) => ({
      ...current,
      showFloatingTimer: value,
      timerExpanded: value ? current.timerExpanded : false,
    })),
    setTimerExpanded: (value) => update((current) => ({ ...current, timerExpanded: value })),

    setCompactMode: (value) => update((current) => ({ ...current, compactMode: value })),
    setAccent: (value) => update((current) => ({ ...current, accent: value })),
    setThemeMode: (value) => update((current) => ({ ...current, themeMode: value })),
    setFontStyle: (value) => update((current) => ({ ...current, fontStyle: value })),

    addCalendarEvent: (event) => {
      update((current) => ({
        ...current,
        calendarEvents: [...current.calendarEvents, createCalendarEvent(event)],
      }));
    },

    addCalendarEvents: (events) => {
      if (events.length === 0) {
        return;
      }

      update((current) => ({
        ...current,
        calendarEvents: [...current.calendarEvents, ...events.map((event) => createCalendarEvent(event))],
      }));
    },

    updateCalendarEvent: (eventId, patch) => {
      update((current) => ({
        ...current,
        calendarEvents: current.calendarEvents.map((event) =>
          event.id === eventId
            ? {
                ...event,
                ...patch,
                updatedAt: Date.now(),
              }
            : event,
        ),
      }));
    },

    deleteCalendarEvent: (eventId) => {
      const timestamp = Date.now();
      set({ now: timestamp });
      update((current) => {
        const isActiveCalendarEvent = current.activeCalendarEventId === eventId;
        const committed = isActiveCalendarEvent ? withCommittedElapsed(current, timestamp) : current;

        return {
          ...committed,
          calendarEvents: committed.calendarEvents.filter((event) => event.id !== eventId),
          activeCalendarEventId: isActiveCalendarEvent ? null : committed.activeCalendarEventId,
          isRunning: isActiveCalendarEvent ? false : committed.isRunning,
          runningSince: isActiveCalendarEvent ? null : committed.runningSince,
          sessionSeconds: isActiveCalendarEvent ? 0 : committed.sessionSeconds,
        };
      });
    },

    rescheduleCalendarEvent: (eventId, startDayKey, startTime) => {
      update((current) => ({
        ...current,
        calendarEvents: current.calendarEvents.map((event) => {
          if (event.id !== eventId) {
            return event;
          }

          const currentStart = timeValueToMinutes(event.startTime);
          const currentEnd = timeValueToMinutes(event.endTime);
          const durationMinutes = Math.max(15, currentEnd - currentStart);
          const nextStart = timeValueToMinutes(startTime);

          return {
            ...event,
            startDayKey,
            endDayKey: startDayKey,
            startTime,
            endTime: minutesToTimeValue(nextStart + durationMinutes),
            updatedAt: Date.now(),
          };
        }),
      }));
    },

    addCalendarBlock: (block) => {
      update((current) => ({
        ...current,
        calendarBlocks: [...current.calendarBlocks, createCalendarBlock(block)],
      }));
    },

    deleteCalendarBlock: (blockId) => {
      update((current) => ({
        ...current,
        calendarBlocks: current.calendarBlocks.filter((block) => block.id !== blockId),
      }));
    },
  };
});

// Clear the active task if it disappears or completes (web hook effect parity).
useExecutionStore.subscribe((store, previous) => {
  const { state } = store;
  if (!store.hydrated || state === previous.state || !state.activeTaskId) {
    return;
  }

  if (!state.tasks.some((task) => task.id === state.activeTaskId && !task.completed)) {
    useExecutionStore.setState({
      state: { ...state, activeTaskId: null, isRunning: false, runningSince: null, sessionSeconds: 0 },
    });
  }
});

// Keep the scheduled pomodoro phase-end local notification in sync with timer
// state. This single subscription covers every timer transition (start, resume,
// phase advance -> reschedule the next boundary; pause, stop, complete, skip,
// mode change, task removal -> cancel) without awaiting inside any action, so
// set() stays synchronous. Notification calls are fire-and-forget (void).
//
// Only the NEXT phase boundary is scheduled while the app is backgrounded; the
// foreground resync (ExecutionRuntime) advances phases and reschedules from there.
let lastPhaseEndKey: string | null = null;
useExecutionStore.subscribe((store, previous) => {
  if (!store.hydrated || store.state === previous.state) {
    return;
  }

  const { state } = store;
  const canSchedule =
    state.timerMode === "pomodoro" &&
    state.isRunning &&
    state.runningSince !== null &&
    !state.activeCalendarEventId &&
    state.timerTotalSeconds > 0;

  // De-dupe: only act when the phase boundary actually changes, so unrelated
  // state edits (notes, habits, etc.) don't churn the scheduled notification.
  const key = canSchedule
    ? `${state.runningSince}:${state.timerTotalSeconds}:${state.pomodoroPhase}`
    : "none";
  if (key === lastPhaseEndKey) {
    return;
  }
  lastPhaseEndKey = key;

  if (!canSchedule) {
    void cancelPomodoroPhaseEndNotifications();
    return;
  }

  const config = normalizePomodoroConfig(state.pomodoroConfig);
  // timerTotalSeconds already holds the remaining seconds after any pause/resume,
  // so the boundary is uniformly runningSince + timerTotalSeconds.
  const fireAt = new Date((state.runningSince as number) + state.timerTotalSeconds * 1000);
  void (async () => {
    await cancelPomodoroPhaseEndNotifications();
    await schedulePomodoroPhaseEndNotification(fireAt, state.pomodoroPhase, config.breakMinutes);
  })();
});

// Persist AppState (debounced) and day-module selection on change.
let persistTimer: ReturnType<typeof setTimeout> | null = null;
useExecutionStore.subscribe((store, previous) => {
  if (!store.hydrated) {
    return;
  }

  if (store.state !== previous.state) {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(() => {
      storeState(useExecutionStore.getState().state).catch(() => {});
    }, 250);
  }

  if (store.dayModules !== previous.dayModules) {
    storeDayModules(JSON.stringify(store.dayModules)).catch(() => {});
  }
});
