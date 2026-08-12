import { createInitialState } from "../model/defaults";
import type {
  AppState,
  CalendarBlock,
  CalendarEvent,
  DailyHistoryEntry,
  DailySnapshot,
  FocusSession,
  GoalItem,
  Habit,
  MetricField,
  PrincipleItem,
  Task,
  TaskGroup,
} from "../model/types";
import { supabase } from "../lib/supabase";
import type { DayModuleId } from "../store/executionStore";

export type CloudAppState = {
  state: unknown;
  day_modules: unknown;
  updated_at: string | null;
  deleted_ids: Record<string, string[]>;
};

type CloudRow = Record<string, unknown> & {
  deleted_at?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

const MUTABLE_TABLES = [
  "regimen_tasks",
  "regimen_task_groups",
  "regimen_habits",
  "regimen_metrics",
  "regimen_goals",
  "regimen_principles",
  "regimen_calendar_events",
  "regimen_calendar_blocks",
  "regimen_focus_sessions",
  "regimen_daily_snapshots",
  "regimen_daily_history",
] as const;

function fallbackNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function fallbackString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function fallbackBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function toTimestamp(value: unknown, fallback = Date.now()) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function activeRows(rows: CloudRow[] | null): CloudRow[] {
  return (rows ?? []).filter((row) => !row.deleted_at);
}

function sortByOrder(rows: CloudRow[]) {
  return [...rows].sort((left, right) => {
    const orderDelta = (left.sort_order ?? 0) - (right.sort_order ?? 0);
    if (orderDelta !== 0) {
      return orderDelta;
    }

    return fallbackString(left.created_at).localeCompare(fallbackString(right.created_at));
  });
}

async function selectRows(table: string, userId: string, columns = "*"): Promise<CloudRow[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from(table).select(columns).eq("user_id", userId);
  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown) as CloudRow[];
}

export async function fetchCloudAppState(userId: string): Promise<CloudAppState | null> {
  if (!supabase) {
    return null;
  }

  const [
    userStateResult,
    taskGroups,
    tasks,
    habits,
    metrics,
    goals,
    principles,
    calendarEvents,
    calendarBlocks,
    focusSessions,
    dailySnapshots,
    dailyHistory,
  ] = await Promise.all([
    supabase.from("regimen_user_state").select("*").eq("user_id", userId).maybeSingle(),
    selectRows("regimen_task_groups", userId),
    selectRows("regimen_tasks", userId),
    selectRows("regimen_habits", userId),
    selectRows("regimen_metrics", userId),
    selectRows("regimen_goals", userId),
    selectRows("regimen_principles", userId),
    selectRows("regimen_calendar_events", userId),
    selectRows("regimen_calendar_blocks", userId),
    selectRows("regimen_focus_sessions", userId),
    selectRows(
      "regimen_daily_snapshots",
      userId,
      "user_id,day_key,focus_seconds,completed_tasks,completed_habits,total_habits,started_before_phone,avoided_scrolling_before_work,created_at,updated_at,deleted_at",
    ),
    selectRows("regimen_daily_history", userId),
  ]);

  if (userStateResult.error) {
    throw userStateResult.error;
  }

  const hasCloudRows =
    userStateResult.data ||
    taskGroups.length ||
    tasks.length ||
    habits.length ||
    metrics.length ||
    goals.length ||
    principles.length ||
    calendarEvents.length ||
    calendarBlocks.length ||
    focusSessions.length ||
    dailySnapshots.length ||
    dailyHistory.length;

  if (!hasCloudRows) {
    return null;
  }

  const base = createInitialState();
  const userState = userStateResult.data as CloudRow | null;
  const nextGoals: AppState["goals"] = { vision: [], month: [], today: [] };
  for (const goal of sortByOrder(activeRows(goals))) {
    const bucket = goal.bucket;
    if (bucket !== "vision" && bucket !== "month" && bucket !== "today") {
      continue;
    }

    nextGoals[bucket].push({
      id: fallbackString(goal.id, `goal-${bucket}-${Date.now()}`),
      title: fallbackString(goal.title, "Untitled goal"),
      note: fallbackString(goal.note),
    });
  }

  const nextState: AppState = {
    ...base,
    hardestTask: fallbackString(userState?.hardest_task, base.hardestTask),
    firstStep: fallbackString(userState?.first_step, base.firstStep),
    journal: fallbackString(userState?.journal, base.journal),
    monthlyJournal: fallbackString(userState?.monthly_journal, base.monthlyJournal),
    activeTaskId: typeof userState?.active_task_id === "string" ? userState.active_task_id : null,
    activeCalendarEventId: typeof userState?.active_calendar_event_id === "string" ? userState.active_calendar_event_id : null,
    isRunning: fallbackBoolean(userState?.is_running, base.isRunning),
    runningSince: typeof userState?.running_since === "number" ? userState.running_since : null,
    sessionSeconds: fallbackNumber(userState?.session_seconds, base.sessionSeconds),
    todayFocusSeconds: fallbackNumber(userState?.today_focus_seconds, base.todayFocusSeconds),
    timerMode: userState?.timer_mode === "pomodoro" ? "pomodoro" : "free",
    timerTotalSeconds: fallbackNumber(userState?.timer_total_seconds, base.timerTotalSeconds),
    timerAlert: null,
    pomodoroPhase: userState?.pomodoro_phase === "break" ? "break" : "focus",
    pomodoroCompletedFocusBlocks: fallbackNumber(
      userState?.pomodoro_completed_focus_blocks,
      base.pomodoroCompletedFocusBlocks,
    ),
    pomodoroConfig:
      userState?.pomodoro_config && typeof userState.pomodoro_config === "object"
        ? (userState.pomodoro_config as AppState["pomodoroConfig"])
        : base.pomodoroConfig,
    compactMode: fallbackBoolean(userState?.compact_mode, base.compactMode),
    showFloatingTimer: fallbackBoolean(userState?.show_floating_timer, base.showFloatingTimer),
    timerExpanded: fallbackBoolean(userState?.timer_expanded, base.timerExpanded),
    accent:
      userState?.accent === "blue" || userState?.accent === "violet" || userState?.accent === "indigo"
        ? userState.accent
        : base.accent,
    prompts:
      userState?.prompts && typeof userState.prompts === "object"
        ? (userState.prompts as AppState["prompts"])
        : base.prompts,
    goalDrafts:
      userState?.goal_drafts && typeof userState.goal_drafts === "object"
        ? (userState.goal_drafts as AppState["goalDrafts"])
        : base.goalDrafts,
    principleDraft:
      userState?.principle_draft && typeof userState.principle_draft === "object"
        ? (userState.principle_draft as AppState["principleDraft"])
        : base.principleDraft,
    themeMode:
      userState?.theme_mode === "light" || userState?.theme_mode === "dark" || userState?.theme_mode === "system"
        ? userState.theme_mode
        : base.themeMode,
    fontStyle:
      userState?.font_style === "inter" ||
      userState?.font_style === "lora" ||
      userState?.font_style === "mono" ||
      userState?.font_style === "system"
        ? userState.font_style
        : base.fontStyle,
    currentDayKey: fallbackString(userState?.current_day_key, base.currentDayKey),
    taskGroups: sortByOrder(activeRows(taskGroups)).map(
      (group): TaskGroup => ({
        id: fallbackString(group.id),
        title: fallbackString(group.title, "Untitled group"),
      }),
    ),
    tasks: sortByOrder(activeRows(tasks)).map(
      (task): Task => ({
        id: fallbackString(task.id),
        groupId: fallbackString(task.group_id),
        title: fallbackString(task.title, "Untitled task"),
        completed: fallbackBoolean(task.completed),
        completedDayKey: typeof task.completed_day_key === "string" ? task.completed_day_key : null,
        secondsSpent: fallbackNumber(task.seconds_spent),
        notes: fallbackString(task.notes),
        kanbanStatus:
          task.kanban_status === "in_progress" || task.kanban_status === "done" ? task.kanban_status : "backlog",
      }),
    ),
    habits: sortByOrder(activeRows(habits)).map(
      (habit): Habit => ({
        id: fallbackString(habit.id),
        label: fallbackString(habit.label, "Untitled habit"),
        checked: fallbackBoolean(habit.checked),
      }),
    ),
    metrics: sortByOrder(activeRows(metrics)).map(
      (metric): MetricField => ({
        id: fallbackString(metric.id),
        label: fallbackString(metric.label, "Untitled metric"),
        type: metric.type === "number" || metric.type === "text" ? metric.type : "time",
        value: fallbackString(metric.value),
        target: fallbackString(metric.target),
      }),
    ),
    goals: nextGoals,
    principles: sortByOrder(activeRows(principles)).map(
      (principle): PrincipleItem => ({
        id: fallbackString(principle.id),
        title: fallbackString(principle.title, "Untitled principle"),
        note: fallbackString(principle.note),
      }),
    ),
    calendarEvents: activeRows(calendarEvents).map(
      (event): CalendarEvent => ({
        id: fallbackString(event.id),
        title: fallbackString(event.title, "Untitled event"),
        startDayKey: fallbackString(event.start_day_key, base.currentDayKey),
        endDayKey: fallbackString(event.end_day_key, fallbackString(event.start_day_key, base.currentDayKey)),
        startTime: fallbackString(event.start_time, "09:00"),
        endTime: fallbackString(event.end_time, "10:00"),
        color:
          event.color === "mint" ||
          event.color === "amber" ||
          event.color === "rose" ||
          event.color === "sky" ||
          event.color === "violet"
            ? event.color
            : "sage",
        notes: fallbackString(event.notes),
        reminderMinutes: typeof event.reminder_minutes === "number" ? event.reminder_minutes : null,
        repeat:
          event.repeat === "daily" || event.repeat === "weekly" || event.repeat === "monthly" || event.repeat === "yearly"
            ? event.repeat
            : "none",
        repeatEndDayKey: typeof event.repeat_end_day_key === "string" ? event.repeat_end_day_key : null,
        createdAt: toTimestamp(event.created_at_ms ?? event.created_at),
        updatedAt: toTimestamp(event.updated_at_ms ?? event.updated_at),
      }),
    ),
    calendarBlocks: sortByOrder(activeRows(calendarBlocks)).map(
      (block): CalendarBlock => ({
        id: fallbackString(block.id),
        title: fallbackString(block.title, "Untitled block"),
        durationMinutes: fallbackNumber(block.duration_minutes, 60),
        color:
          block.color === "mint" ||
          block.color === "amber" ||
          block.color === "rose" ||
          block.color === "sky" ||
          block.color === "violet"
            ? block.color
            : "sage",
        notes: fallbackString(block.notes),
        createdAt: toTimestamp(block.created_at_ms ?? block.created_at),
        updatedAt: toTimestamp(block.updated_at_ms ?? block.updated_at),
      }),
    ),
    focusSessions: activeRows(focusSessions).map(
      (session): FocusSession => ({
        id: fallbackString(session.id),
        taskId: fallbackString(session.task_id),
        taskTitle: fallbackString(session.task_title, "Focus session"),
        durationSeconds: fallbackNumber(session.duration_seconds),
        startedAt: toTimestamp(session.started_at),
        endedAt: toTimestamp(session.ended_at),
      }),
    ),
    dailySnapshots: Object.fromEntries(
      dailySnapshots.map((snapshot) => {
        const completedHabits = fallbackNumber(snapshot.completed_habits);
        return [
          fallbackString(snapshot.day_key),
          {
            dayKey: fallbackString(snapshot.day_key),
            focusSeconds: fallbackNumber(snapshot.focus_seconds),
            completedTasks: fallbackNumber(snapshot.completed_tasks),
            completedHabits,
            totalHabits: fallbackNumber(snapshot.total_habits, Math.max(completedHabits, base.habits.length)),
            startedBeforePhone: fallbackBoolean(snapshot.started_before_phone),
            avoidedScrollingBeforeWork: fallbackBoolean(snapshot.avoided_scrolling_before_work),
          } satisfies DailySnapshot,
        ];
      }),
    ),
    dailyHistory: Object.fromEntries(
      dailyHistory.map((entry) => [
        fallbackString(entry.day_key),
        {
          dayKey: fallbackString(entry.day_key),
          capturedAt: toTimestamp(entry.captured_at),
          hardestTask: fallbackString(entry.hardest_task),
          firstStep: fallbackString(entry.first_step),
          journal: fallbackString(entry.journal),
          monthlyJournal: fallbackString(entry.monthly_journal),
          tasks: Array.isArray(entry.tasks) ? entry.tasks : [],
          habits: Array.isArray(entry.habits) ? entry.habits : [],
          metrics: Array.isArray(entry.metrics) ? entry.metrics : [],
          goals: entry.goals && typeof entry.goals === "object" ? (entry.goals as Record<string, GoalItem[]>) : base.goals,
          snapshot:
            entry.snapshot && typeof entry.snapshot === "object"
              ? (entry.snapshot as DailySnapshot)
              : {
                  dayKey: fallbackString(entry.day_key),
                  focusSeconds: 0,
                  completedTasks: 0,
                  completedHabits: 0,
                  totalHabits: 0,
                },
        } satisfies DailyHistoryEntry,
      ]),
    ),
  };

  return {
    state: nextState,
    day_modules: userState?.day_modules,
    updated_at: typeof userState?.updated_at === "string" ? userState.updated_at : null,
    deleted_ids: {
      regimen_task_groups: taskGroups.filter((row) => row.deleted_at).map((row) => fallbackString(row.id)),
      regimen_tasks: tasks.filter((row) => row.deleted_at).map((row) => fallbackString(row.id)),
      regimen_habits: habits.filter((row) => row.deleted_at).map((row) => fallbackString(row.id)),
      regimen_metrics: metrics.filter((row) => row.deleted_at).map((row) => fallbackString(row.id)),
      regimen_goals: goals.filter((row) => row.deleted_at).map((row) => fallbackString(row.id)),
      regimen_principles: principles.filter((row) => row.deleted_at).map((row) => fallbackString(row.id)),
      regimen_calendar_events: calendarEvents.filter((row) => row.deleted_at).map((row) => fallbackString(row.id)),
      regimen_calendar_blocks: calendarBlocks.filter((row) => row.deleted_at).map((row) => fallbackString(row.id)),
      regimen_focus_sessions: focusSessions.filter((row) => row.deleted_at).map((row) => fallbackString(row.id)),
      regimen_daily_snapshots: dailySnapshots.filter((row) => row.deleted_at).map((row) => fallbackString(row.day_key)),
      regimen_daily_history: dailyHistory.filter((row) => row.deleted_at).map((row) => fallbackString(row.day_key)),
    },
  };
}

async function replaceRows(table: (typeof MUTABLE_TABLES)[number], userId: string, rows: Array<Record<string, unknown>>) {
  if (!supabase) {
    return;
  }

  const deleteResult = await supabase.from(table).delete().eq("user_id", userId);
  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from(table).insert(rows);
  if (error) {
    throw error;
  }
}

export async function upsertCloudAppState(userId: string, state: AppState, dayModules: DayModuleId[]) {
  if (!supabase) {
    return;
  }

  const now = new Date().toISOString();
  const userStateResult = await supabase.from("regimen_user_state").upsert(
    {
      user_id: userId,
      current_day_key: state.currentDayKey,
      hardest_task: state.hardestTask,
      first_step: state.firstStep,
      journal: state.journal,
      monthly_journal: state.monthlyJournal,
      active_task_id: state.activeTaskId,
      active_calendar_event_id: state.activeCalendarEventId,
      is_running: state.isRunning,
      running_since: state.runningSince,
      session_seconds: state.sessionSeconds,
      today_focus_seconds: state.todayFocusSeconds,
      timer_mode: state.timerMode,
      timer_total_seconds: state.timerTotalSeconds,
      timer_alert: state.timerAlert,
      pomodoro_phase: state.pomodoroPhase,
      pomodoro_completed_focus_blocks: state.pomodoroCompletedFocusBlocks,
      pomodoro_config: state.pomodoroConfig,
      compact_mode: state.compactMode,
      show_floating_timer: state.showFloatingTimer,
      timer_expanded: state.timerExpanded,
      accent: state.accent,
      prompts: state.prompts,
      goal_drafts: state.goalDrafts,
      principle_draft: state.principleDraft,
      theme_mode: state.themeMode,
      font_style: state.fontStyle,
      day_modules: dayModules,
      schema_version: 2,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (userStateResult.error) {
    throw userStateResult.error;
  }

  await Promise.all([
    replaceRows(
      "regimen_task_groups",
      userId,
      state.taskGroups.map((group, index) => ({
        user_id: userId,
        id: group.id,
        title: group.title,
        sort_order: index,
        created_at: now,
        updated_at: now,
      })),
    ),
    replaceRows(
      "regimen_tasks",
      userId,
      state.tasks.map((task, index) => ({
        user_id: userId,
        id: task.id,
        group_id: task.groupId,
        title: task.title,
        completed: task.completed,
        completed_day_key: task.completedDayKey,
        seconds_spent: task.secondsSpent,
        notes: task.notes,
        kanban_status: task.kanbanStatus,
        sort_order: index,
        created_at: now,
        updated_at: now,
      })),
    ),
    replaceRows(
      "regimen_habits",
      userId,
      state.habits.map((habit, index) => ({
        user_id: userId,
        id: habit.id,
        label: habit.label,
        checked: habit.checked,
        sort_order: index,
        created_at: now,
        updated_at: now,
      })),
    ),
    replaceRows(
      "regimen_metrics",
      userId,
      state.metrics.map((metric, index) => ({
        user_id: userId,
        id: metric.id,
        label: metric.label,
        type: metric.type,
        value: metric.value,
        target: metric.target,
        sort_order: index,
        created_at: now,
        updated_at: now,
      })),
    ),
    replaceRows(
      "regimen_goals",
      userId,
      (Object.entries(state.goals) as Array<[keyof AppState["goals"], GoalItem[]]>).flatMap(([bucket, goals]) =>
        goals.map((goal, index) => ({
          user_id: userId,
          id: goal.id,
          bucket,
          title: goal.title,
          note: goal.note,
          sort_order: index,
          created_at: now,
          updated_at: now,
        })),
      ),
    ),
    replaceRows(
      "regimen_principles",
      userId,
      state.principles.map((principle, index) => ({
        user_id: userId,
        id: principle.id,
        title: principle.title,
        note: principle.note,
        sort_order: index,
        created_at: now,
        updated_at: now,
      })),
    ),
    replaceRows(
      "regimen_calendar_events",
      userId,
      state.calendarEvents.map((event) => ({
        user_id: userId,
        id: event.id,
        title: event.title,
        start_day_key: event.startDayKey,
        end_day_key: event.endDayKey,
        start_time: event.startTime,
        end_time: event.endTime,
        color: event.color,
        notes: event.notes,
        reminder_minutes: event.reminderMinutes,
        repeat: event.repeat,
        repeat_end_day_key: event.repeatEndDayKey,
        created_at_ms: event.createdAt,
        updated_at_ms: event.updatedAt,
        created_at: new Date(event.createdAt).toISOString(),
        updated_at: new Date(event.updatedAt).toISOString(),
      })),
    ),
    replaceRows(
      "regimen_calendar_blocks",
      userId,
      state.calendarBlocks.map((block, index) => ({
        user_id: userId,
        id: block.id,
        title: block.title,
        duration_minutes: block.durationMinutes,
        color: block.color,
        notes: block.notes,
        created_at_ms: block.createdAt,
        updated_at_ms: block.updatedAt,
        sort_order: index,
        created_at: new Date(block.createdAt).toISOString(),
        updated_at: new Date(block.updatedAt).toISOString(),
      })),
    ),
    replaceRows(
      "regimen_focus_sessions",
      userId,
      state.focusSessions.map((session) => ({
        user_id: userId,
        id: session.id,
        task_id: session.taskId,
        task_title: session.taskTitle,
        duration_seconds: session.durationSeconds,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        created_at: new Date(session.endedAt).toISOString(),
        updated_at: now,
      })),
    ),
    replaceRows(
      "regimen_daily_snapshots",
      userId,
      Object.values(state.dailySnapshots).map((snapshot) => ({
        user_id: userId,
        day_key: snapshot.dayKey,
        focus_seconds: snapshot.focusSeconds,
        completed_tasks: snapshot.completedTasks,
        completed_habits: snapshot.completedHabits,
        total_habits: snapshot.totalHabits,
        started_before_phone: Boolean(snapshot.startedBeforePhone),
        avoided_scrolling_before_work: Boolean(snapshot.avoidedScrollingBeforeWork),
        created_at: now,
        updated_at: now,
      })),
    ),
    replaceRows(
      "regimen_daily_history",
      userId,
      Object.values(state.dailyHistory).map((entry) => ({
        user_id: userId,
        day_key: entry.dayKey,
        captured_at: entry.capturedAt,
        hardest_task: entry.hardestTask,
        first_step: entry.firstStep,
        journal: entry.journal,
        monthly_journal: entry.monthlyJournal,
        tasks: entry.tasks,
        habits: entry.habits,
        metrics: entry.metrics,
        goals: entry.goals,
        snapshot: entry.snapshot,
        created_at: new Date(entry.capturedAt).toISOString(),
        updated_at: now,
      })),
    ),
  ]);
}
