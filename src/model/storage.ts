import AsyncStorage from "@react-native-async-storage/async-storage";
import { createInitialState } from "./defaults";
import type { AppState, CalendarBlock, CalendarColorKey, CalendarEvent, CalendarRepeat, DailyHistoryEntry, Task, TaskGroup, TaskKanbanStatus, ThemeMode } from "./types";

export const STORAGE_KEY = "execution-os-state:v1";
export const DAY_MODULES_KEY = "execution-os-day-modules:v1";

function normalizeTaskKanbanStatus(value: unknown, completed: boolean): TaskKanbanStatus {
  if (value === "backlog" || value === "in_progress" || value === "done") {
    return value;
  }

  return completed ? "done" : "backlog";
}

function normalizeCalendarColor(value: unknown): CalendarColorKey {
  if (value === "sage" || value === "mint" || value === "amber" || value === "rose" || value === "sky" || value === "violet") {
    return value;
  }

  return "sage";
}

function normalizeCalendarRepeat(value: unknown): CalendarRepeat {
  if (value === "daily" || value === "weekly" || value === "monthly" || value === "yearly") {
    return value;
  }

  return "none";
}

function normalizeThemeMode(value: unknown): ThemeMode {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "system";
}

function isDayKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeValue(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stripLegacyPersistedState(raw: Record<string, unknown>) {
  const { taskNotes: _legacy, ...rest } = raw;
  return rest;
}

function normalizeTaskData(parsed: Partial<AppState>, fallback: AppState) {
  const parsedGroups = Array.isArray(parsed.taskGroups) ? parsed.taskGroups : fallback.taskGroups;
  const parsedTasks = Array.isArray(parsed.tasks) ? parsed.tasks : fallback.tasks;

  const hasUngroupedTasks = parsedTasks.some((task) => !("groupId" in task) || !task.groupId);
  const defaultGroupId = parsedGroups[0]?.id ?? "group-general";
  const taskGroups: TaskGroup[] = hasUngroupedTasks && parsedGroups.length === 0 ? [{ id: defaultGroupId, title: "General" }] : parsedGroups;
  const tasks: Task[] = parsedTasks
    .filter((task) => task !== null && typeof task === "object" && !Array.isArray(task))
    .map((task) => {
      const rawTask = task as Partial<Task> & Record<string, unknown>;
      const completed = Boolean(rawTask.completed);
      const next: Task = {
        id: typeof rawTask.id === "string" ? rawTask.id : `task-${Math.random().toString(36).slice(2, 10)}`,
        title: typeof rawTask.title === "string" ? rawTask.title : "Untitled task",
        completed,
        groupId: typeof rawTask.groupId === "string" ? rawTask.groupId : defaultGroupId,
        completedDayKey: rawTask.completedDayKey === null || typeof rawTask.completedDayKey === "string" ? (rawTask.completedDayKey ?? null) : null,
        secondsSpent: typeof rawTask.secondsSpent === "number" && Number.isFinite(rawTask.secondsSpent) ? rawTask.secondsSpent : 0,
        notes: typeof rawTask.notes === "string" ? rawTask.notes : "",
        kanbanStatus: normalizeTaskKanbanStatus(rawTask.kanbanStatus, completed),
      };
      return next;
    });

  return { taskGroups, tasks };
}

function normalizeCalendarEvents(parsed: Partial<AppState>, fallback: AppState): CalendarEvent[] {
  if (!Array.isArray(parsed.calendarEvents)) {
    return fallback.calendarEvents;
  }

  return parsed.calendarEvents
    .filter((event) => isPlainObject(event))
    .map((event) => {
      const rawEvent = event as Partial<CalendarEvent> & Record<string, unknown>;
      const startDayKey = isDayKey(rawEvent.startDayKey) ? rawEvent.startDayKey : fallback.currentDayKey;
      const endDayKey = isDayKey(rawEvent.endDayKey) ? rawEvent.endDayKey : startDayKey;
      const createdAt = typeof rawEvent.createdAt === "number" && Number.isFinite(rawEvent.createdAt) ? rawEvent.createdAt : Date.now();
      const updatedAt = typeof rawEvent.updatedAt === "number" && Number.isFinite(rawEvent.updatedAt) ? rawEvent.updatedAt : createdAt;

      return {
        id: typeof rawEvent.id === "string" ? rawEvent.id : `event-${Math.random().toString(36).slice(2, 10)}`,
        title: typeof rawEvent.title === "string" && rawEvent.title.trim() ? rawEvent.title : "Untitled event",
        startDayKey,
        endDayKey,
        startTime: isTimeValue(rawEvent.startTime) ? rawEvent.startTime : "09:00",
        endTime: isTimeValue(rawEvent.endTime) ? rawEvent.endTime : "10:00",
        color: normalizeCalendarColor(rawEvent.color),
        notes: typeof rawEvent.notes === "string" ? rawEvent.notes : "",
        reminderMinutes: typeof rawEvent.reminderMinutes === "number" && Number.isFinite(rawEvent.reminderMinutes) ? rawEvent.reminderMinutes : null,
        repeat: normalizeCalendarRepeat(rawEvent.repeat),
        repeatEndDayKey: isDayKey(rawEvent.repeatEndDayKey) ? rawEvent.repeatEndDayKey : null,
        createdAt,
        updatedAt,
      };
    });
}

function normalizeCalendarBlocks(parsed: Partial<AppState>, fallback: AppState): CalendarBlock[] {
  if (!Array.isArray(parsed.calendarBlocks)) {
    return fallback.calendarBlocks;
  }

  return parsed.calendarBlocks
    .filter((block) => isPlainObject(block))
    .map((block) => {
      const rawBlock = block as Partial<CalendarBlock> & Record<string, unknown>;
      const createdAt = typeof rawBlock.createdAt === "number" && Number.isFinite(rawBlock.createdAt) ? rawBlock.createdAt : Date.now();
      const updatedAt = typeof rawBlock.updatedAt === "number" && Number.isFinite(rawBlock.updatedAt) ? rawBlock.updatedAt : createdAt;

      return {
        id: typeof rawBlock.id === "string" ? rawBlock.id : `block-${Math.random().toString(36).slice(2, 10)}`,
        title: typeof rawBlock.title === "string" && rawBlock.title.trim() ? rawBlock.title : "Untitled block",
        durationMinutes: typeof rawBlock.durationMinutes === "number" && Number.isFinite(rawBlock.durationMinutes)
          ? Math.max(15, Math.min(480, Math.floor(rawBlock.durationMinutes)))
          : 60,
        color: normalizeCalendarColor(rawBlock.color),
        notes: typeof rawBlock.notes === "string" ? rawBlock.notes : "",
        createdAt,
        updatedAt,
      };
    });
}

function normalizeDailyHistory(parsed: Partial<AppState>, fallback: AppState) {
  const raw = parsed.dailyHistory;
  if (!isPlainObject(raw)) {
    return fallback.dailyHistory;
  }

  const entries = Object.entries(raw)
    .filter(([, entry]) => isPlainObject(entry))
    .map(([dayKey, entry]) => {
      const e = entry as Record<string, unknown>;
      const merged = { ...e, tasks: Array.isArray(e.tasks) ? e.tasks : [] } as DailyHistoryEntry;
      return [dayKey, merged] as const;
    });

  return Object.fromEntries(entries) as AppState["dailyHistory"];
}

export function normalizeStoredState(rawValue: string | null): AppState {
  const fallback = createInitialState();

  if (!rawValue) {
    return fallback;
  }

  try {
    const rawParsed: unknown = JSON.parse(rawValue);
    if (!isPlainObject(rawParsed)) {
      return fallback;
    }

    const parsed = stripLegacyPersistedState(rawParsed) as Partial<AppState>;
    const normalizedTaskData = normalizeTaskData(parsed, fallback);
    const normalizedDailyHistory = normalizeDailyHistory(parsed, fallback);
    const normalizedPomodoroConfig = {
      workMinutes: parsed.pomodoroConfig?.workMinutes ?? fallback.pomodoroConfig.workMinutes,
      breakMinutes: parsed.pomodoroConfig?.breakMinutes ?? fallback.pomodoroConfig.breakMinutes,
      rounds: parsed.pomodoroConfig?.rounds ?? fallback.pomodoroConfig.rounds,
    };
    const dailySnapshots = isPlainObject(parsed.dailySnapshots) ? (parsed.dailySnapshots as AppState["dailySnapshots"]) : fallback.dailySnapshots;
    const focusSessions = Array.isArray(parsed.focusSessions) ? parsed.focusSessions : fallback.focusSessions;
    const calendarEvents = normalizeCalendarEvents(parsed, fallback);
    const calendarBlocks = normalizeCalendarBlocks(parsed, fallback);
    const activeCalendarEventId = typeof parsed.activeCalendarEventId === "string" ? parsed.activeCalendarEventId : null;
    const habits = Array.isArray(parsed.habits) ? parsed.habits : fallback.habits;
    const metrics = Array.isArray(parsed.metrics) ? parsed.metrics : fallback.metrics;

    return {
      ...fallback,
      ...parsed,
      taskGroups: normalizedTaskData.taskGroups,
      tasks: normalizedTaskData.tasks,
      habits,
      prompts: parsed.prompts ?? fallback.prompts,
      metrics,
      goals: parsed.goals ?? fallback.goals,
      principles: parsed.principles ?? fallback.principles,
      goalDrafts: parsed.goalDrafts ?? fallback.goalDrafts,
      principleDraft: parsed.principleDraft ?? fallback.principleDraft,
      timerAlert: null,
      activeCalendarEventId,
      pomodoroPhase: parsed.pomodoroPhase === "break" ? "break" : "focus",
      pomodoroConfig: normalizedPomodoroConfig,
      themeMode: normalizeThemeMode(parsed.themeMode),
      focusSessions,
      calendarEvents,
      calendarBlocks,
      dailySnapshots,
      dailyHistory: normalizedDailyHistory,
    };
  } catch {
    return fallback;
  }
}

export async function loadStoredState(): Promise<AppState> {
  const rawValue = await AsyncStorage.getItem(STORAGE_KEY);
  return normalizeStoredState(rawValue);
}

export async function storeState(state: AppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
