import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppState, GoalItem } from "../model/types";
import { supabase } from "../lib/supabase";
import type { DayModuleId } from "../store/executionStore";

export type SyncSnapshot = {
  state: AppState;
  dayModules: DayModuleId[];
};

type RowSpec = {
  table: string;
  keyColumn: "id" | "day_key";
  rows: (state: AppState) => Array<Record<string, unknown>>;
};

const DEVICE_ID_KEY = "regimen-sync-device-id:v2";

const ROW_SPECS: RowSpec[] = [
  {
    table: "regimen_task_groups",
    keyColumn: "id",
    rows: (state) => state.taskGroups.map((group, sort_order) => ({ id: group.id, title: group.title, sort_order })),
  },
  {
    table: "regimen_tasks",
    keyColumn: "id",
    rows: (state) => state.tasks.map((task, sort_order) => ({
      id: task.id,
      group_id: task.groupId,
      title: task.title,
      completed: task.completed,
      completed_day_key: task.completedDayKey,
      seconds_spent: task.secondsSpent,
      notes: task.notes,
      kanban_status: task.kanbanStatus,
      sort_order,
    })),
  },
  {
    table: "regimen_habits",
    keyColumn: "id",
    rows: (state) => state.habits.map((habit, sort_order) => ({ id: habit.id, label: habit.label, checked: habit.checked, sort_order })),
  },
  {
    table: "regimen_metrics",
    keyColumn: "id",
    rows: (state) => state.metrics.map((metric, sort_order) => ({
      id: metric.id,
      label: metric.label,
      type: metric.type,
      value: metric.value,
      target: metric.target,
      sort_order,
    })),
  },
  {
    table: "regimen_goals",
    keyColumn: "id",
    rows: (state) => (Object.entries(state.goals) as Array<[keyof AppState["goals"], GoalItem[]]>).flatMap(
      ([bucket, goals]) => goals.map((goal, sort_order) => ({
        id: goal.id,
        bucket,
        title: goal.title,
        note: goal.note,
        sort_order,
      })),
    ),
  },
  {
    table: "regimen_principles",
    keyColumn: "id",
    rows: (state) => state.principles.map((principle, sort_order) => ({
      id: principle.id,
      title: principle.title,
      note: principle.note,
      sort_order,
    })),
  },
  {
    table: "regimen_calendar_events",
    keyColumn: "id",
    rows: (state) => state.calendarEvents.map((event) => ({
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
    })),
  },
  {
    table: "regimen_calendar_blocks",
    keyColumn: "id",
    rows: (state) => state.calendarBlocks.map((block, sort_order) => ({
      id: block.id,
      title: block.title,
      duration_minutes: block.durationMinutes,
      color: block.color,
      notes: block.notes,
      created_at_ms: block.createdAt,
      updated_at_ms: block.updatedAt,
      sort_order,
    })),
  },
  {
    table: "regimen_focus_sessions",
    keyColumn: "id",
    rows: (state) => state.focusSessions.map((session) => ({
      id: session.id,
      task_id: session.taskId,
      task_title: session.taskTitle,
      duration_seconds: session.durationSeconds,
      started_at: session.startedAt,
      ended_at: session.endedAt,
    })),
  },
  {
    table: "regimen_daily_snapshots",
    keyColumn: "day_key",
    rows: (state) => Object.values(state.dailySnapshots).map((snapshot) => ({
      day_key: snapshot.dayKey,
      focus_seconds: snapshot.focusSeconds,
      completed_tasks: snapshot.completedTasks,
      completed_habits: snapshot.completedHabits,
      total_habits: snapshot.totalHabits,
      started_before_phone: Boolean(snapshot.startedBeforePhone),
      avoided_scrolling_before_work: Boolean(snapshot.avoidedScrollingBeforeWork),
    })),
  },
  {
    table: "regimen_daily_history",
    keyColumn: "day_key",
    rows: (state) => Object.values(state.dailyHistory).map((entry) => ({
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
    })),
  },
];

function stableValue(value: unknown) {
  return JSON.stringify(value);
}

function rowMap(spec: RowSpec, state?: AppState) {
  const rows = state ? spec.rows(state) : [];
  return new Map(rows.map((row) => [String(row[spec.keyColumn]), row]));
}

function buildUserState(snapshot: SyncSnapshot) {
  const state = snapshot.state;
  return {
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
    day_modules: snapshot.dayModules,
    schema_version: 2,
  };
}

export async function getSyncDeviceId() {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    return stored;
  }

  const created = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function pushCloudDelta(
  userId: string,
  previous: SyncSnapshot | null,
  current: SyncSnapshot,
  deviceId: string,
) {
  if (!supabase) {
    return;
  }

  const updatedAt = new Date().toISOString();
  const previousUserState = previous ? buildUserState(previous) : null;
  const currentUserState = buildUserState(current);

  if (!previousUserState || stableValue(previousUserState) !== stableValue(currentUserState)) {
    const { error } = await supabase.from("regimen_user_state").upsert(
      {
        user_id: userId,
        ...currentUserState,
        sync_revision: Date.now(),
        modified_by: deviceId,
        updated_at: updatedAt,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      throw error;
    }
  }

  for (const spec of ROW_SPECS) {
    const before = rowMap(spec, previous?.state);
    const after = rowMap(spec, current.state);
    const changed = [...after.entries()]
      .filter(([key, row]) => stableValue(before.get(key)) !== stableValue(row))
      .map(([, row]) => ({
        user_id: userId,
        ...row,
        deleted_at: null,
        modified_by: deviceId,
        updated_at: updatedAt,
      }));
    const removed = [...before.keys()].filter((key) => !after.has(key));

    if (changed.length > 0) {
      const { error } = await supabase.from(spec.table).upsert(changed, {
        onConflict: `user_id,${spec.keyColumn}`,
      });
      if (error) {
        throw error;
      }
    }

    if (removed.length > 0) {
      const { error } = await supabase
        .from(spec.table)
        .update({ deleted_at: updatedAt, modified_by: deviceId, updated_at: updatedAt })
        .eq("user_id", userId)
        .in(spec.keyColumn, removed);
      if (error) {
        throw error;
      }
    }
  }
}

function mergeArray<T extends { id: string }>(cloud: T[], local: T[], deleted: string[] = []) {
  const deletedIds = new Set(deleted);
  const merged = [...cloud];
  const cloudIds = new Set(cloud.map((item) => item.id));
  for (const item of local) {
    if (!cloudIds.has(item.id) && !deletedIds.has(item.id)) {
      merged.push(item);
    }
  }
  return merged;
}

function mergeRecord<T extends { dayKey: string }>(
  cloud: Record<string, T>,
  local: Record<string, T>,
  deleted: string[] = [],
) {
  const merged = { ...cloud };
  const deletedIds = new Set(deleted);
  for (const [key, value] of Object.entries(local)) {
    if (!(key in merged) && !deletedIds.has(key)) {
      merged[key] = value;
    }
  }
  return merged;
}

export function reconcileInitialState(
  local: SyncSnapshot,
  cloud: SyncSnapshot,
  deletedIds: Record<string, string[]>,
): SyncSnapshot {
  const cloudState = cloud.state;
  return {
    dayModules: cloud.dayModules.length > 0 ? cloud.dayModules : local.dayModules,
    state: {
      ...cloudState,
      taskGroups: mergeArray(cloudState.taskGroups, local.state.taskGroups, deletedIds.regimen_task_groups),
      tasks: mergeArray(cloudState.tasks, local.state.tasks, deletedIds.regimen_tasks),
      habits: mergeArray(cloudState.habits, local.state.habits, deletedIds.regimen_habits),
      metrics: mergeArray(cloudState.metrics, local.state.metrics, deletedIds.regimen_metrics),
      goals: {
        vision: mergeArray(cloudState.goals.vision, local.state.goals.vision, deletedIds.regimen_goals),
        month: mergeArray(cloudState.goals.month, local.state.goals.month, deletedIds.regimen_goals),
        today: mergeArray(cloudState.goals.today, local.state.goals.today, deletedIds.regimen_goals),
      },
      principles: mergeArray(cloudState.principles, local.state.principles, deletedIds.regimen_principles),
      calendarEvents: mergeArray(cloudState.calendarEvents, local.state.calendarEvents, deletedIds.regimen_calendar_events),
      calendarBlocks: mergeArray(cloudState.calendarBlocks, local.state.calendarBlocks, deletedIds.regimen_calendar_blocks),
      focusSessions: mergeArray(cloudState.focusSessions, local.state.focusSessions, deletedIds.regimen_focus_sessions),
      dailySnapshots: mergeRecord(cloudState.dailySnapshots, local.state.dailySnapshots, deletedIds.regimen_daily_snapshots),
      dailyHistory: mergeRecord(cloudState.dailyHistory, local.state.dailyHistory, deletedIds.regimen_daily_history),
    },
  };
}

export const REALTIME_TABLES = ROW_SPECS.map((spec) => spec.table).concat("regimen_user_state");
