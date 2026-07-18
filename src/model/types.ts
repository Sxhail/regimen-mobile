export type MetricType = "time" | "number" | "text";
export type GoalBucketKey = "vision" | "month" | "today";
export type AccentKey = "indigo" | "blue" | "violet";
export type ThemeMode = "system" | "light" | "dark";
export type TimerMode = "free" | "pomodoro";
export type PomodoroPhase = "focus" | "break";
export type CalendarColorKey = "sage" | "mint" | "amber" | "rose" | "sky" | "violet";
export type CalendarRepeat = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type PomodoroConfig = {
  workMinutes: number;
  breakMinutes: number;
  rounds: number;
};

export type TimerAlert = {
  id: number;
  title: string;
  message: string;
};

export type TaskKanbanStatus = "backlog" | "in_progress" | "done";

export type Task = {
  id: string;
  groupId: string;
  title: string;
  completed: boolean;
  completedDayKey: string | null;
  secondsSpent: number;
  notes: string;
  kanbanStatus: TaskKanbanStatus;
};

export type DailyHistoryTask = {
  id: string;
  groupId: string;
  groupTitle: string;
  title: string;
  secondsSpent: number;
  completedDayKey: string | null;
};

export type TaskGroup = {
  id: string;
  title: string;
};

export type Habit = {
  id: string;
  label: string;
  checked: boolean;
};

export type PromptSet = {
  daily: string[];
  monthly: string[];
};

export type MetricField = {
  id: string;
  label: string;
  type: MetricType;
  value: string;
  target: string;
};

export type GoalItem = {
  id: string;
  title: string;
  note: string;
};

export type GoalDraft = {
  title: string;
  note: string;
};

export type FocusSession = {
  id: string;
  taskId: string;
  taskTitle: string;
  durationSeconds: number;
  startedAt: number;
  endedAt: number;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startDayKey: string;
  endDayKey: string;
  startTime: string;
  endTime: string;
  color: CalendarColorKey;
  notes: string;
  reminderMinutes: number | null;
  repeat: CalendarRepeat;
  repeatEndDayKey: string | null;
  createdAt: number;
  updatedAt: number;
};

export type CalendarBlock = {
  id: string;
  title: string;
  durationMinutes: number;
  color: CalendarColorKey;
  notes: string;
  createdAt: number;
  updatedAt: number;
};

export type DailySnapshot = {
  dayKey: string;
  focusSeconds: number;
  completedTasks: number;
  completedHabits: number;
  startedBeforePhone: boolean;
  avoidedScrollingBeforeWork: boolean;
};

export type DailyHistoryEntry = {
  dayKey: string;
  capturedAt: number;
  hardestTask: string;
  firstStep: string;
  journal: string;
  monthlyJournal: string;
  tasks: DailyHistoryTask[];
  habits: Habit[];
  metrics: MetricField[];
  goals: Record<GoalBucketKey, GoalItem[]>;
  snapshot: DailySnapshot;
};

export type AppState = {
  hardestTask: string;
  firstStep: string;
  taskGroups: TaskGroup[];
  tasks: Task[];
  habits: Habit[];
  journal: string;
  monthlyJournal: string;
  prompts: PromptSet;
  metrics: MetricField[];
  goals: Record<GoalBucketKey, GoalItem[]>;
  goalDrafts: Record<GoalBucketKey, GoalDraft>;
  activeTaskId: string | null;
  activeCalendarEventId: string | null;
  isRunning: boolean;
  runningSince: number | null;
  sessionSeconds: number;
  todayFocusSeconds: number;
  timerMode: TimerMode;
  timerTotalSeconds: number;
  timerAlert: TimerAlert | null;
  pomodoroPhase: PomodoroPhase;
  pomodoroCompletedFocusBlocks: number;
  pomodoroConfig: PomodoroConfig;
  compactMode: boolean;
  showFloatingTimer: boolean;
  timerExpanded: boolean;
  accent: AccentKey;
  themeMode: ThemeMode;
  focusSessions: FocusSession[];
  calendarEvents: CalendarEvent[];
  calendarBlocks: CalendarBlock[];
  dailySnapshots: Record<string, DailySnapshot>;
  dailyHistory: Record<string, DailyHistoryEntry>;
  currentDayKey: string;
};

export type WeeklyPoint = {
  day: string;
  focus: number;
  won: boolean;
};
