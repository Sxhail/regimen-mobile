import type { AppState, CalendarBlock, CalendarEvent, GoalBucketKey, Habit, MetricField, PromptSet, Task, TaskGroup } from "./types";

// "Started work before phone" and "No doomscrolling before work" are matched
// by label in the win/lose-day snapshot logic — keep these strings exact.
export const defaultHabits: Habit[] = [
  { id: "habit-1", label: "Started work before phone", checked: false },
  { id: "habit-2", label: "Completed deep work session", checked: false },
  { id: "habit-3", label: "No doomscrolling before work", checked: false },
  { id: "habit-4", label: "Workout", checked: false },
  { id: "habit-5", label: "Journal completed", checked: false },
];

export const defaultTasks: Task[] = [];

export const defaultTaskGroups: TaskGroup[] = [];

export const defaultPrompts: PromptSet = {
  daily: ["What matters today?", "What did I avoid today?", "What did I do well?"],
  monthly: ["What actually mattered this month?", "What did I avoid?", "What needs to change next month?"],
};

export const defaultMetrics: MetricField[] = [];

export const defaultGoals: AppState["goals"] = {
  vision: [],
  month: [],
  today: [],
};

export const defaultPrinciples: AppState["principles"] = [];

export const defaultCalendarEvents: CalendarEvent[] = [];
export const defaultCalendarBlocks: CalendarBlock[] = [];

export const defaultGoalDrafts: Record<GoalBucketKey, { title: string; note: string }> = {
  vision: { title: "", note: "" },
  month: { title: "", note: "" },
  today: { title: "", note: "" },
};

export function getDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialState(): AppState {
  return {
    hardestTask: "",
    firstStep: "",
    taskGroups: defaultTaskGroups,
    tasks: defaultTasks,
    habits: defaultHabits,
    journal: "",
    monthlyJournal: "",
    prompts: defaultPrompts,
    metrics: defaultMetrics,
    goals: defaultGoals,
    principles: defaultPrinciples,
    goalDrafts: defaultGoalDrafts,
    principleDraft: { title: "", note: "" },
    activeTaskId: null,
    activeCalendarEventId: null,
    isRunning: false,
    runningSince: null,
    sessionSeconds: 0,
    todayFocusSeconds: 0,
    timerMode: "free",
    timerTotalSeconds: 25 * 60,
    timerAlert: null,
    pomodoroPhase: "focus",
    pomodoroCompletedFocusBlocks: 0,
    pomodoroConfig: {
      workMinutes: 25,
      breakMinutes: 5,
      rounds: 4,
    },
    compactMode: false,
    showFloatingTimer: false,
    timerExpanded: false,
    accent: "indigo",
    themeMode: "system",
    focusSessions: [],
    calendarEvents: defaultCalendarEvents,
    calendarBlocks: defaultCalendarBlocks,
    dailySnapshots: {},
    dailyHistory: {},
    currentDayKey: getDayKey(),
  };
}
