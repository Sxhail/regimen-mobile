import * as SQLite from "expo-sqlite";

const DB_NAME = "regimen.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }

  return dbPromise;
}

export async function initializeRowSchema() {
  const db = await getDb();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_task_groups (
      user_id TEXT,
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_tasks (
      user_id TEXT,
      id TEXT PRIMARY KEY NOT NULL,
      group_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_day_key TEXT,
      seconds_spent INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      kanban_status TEXT NOT NULL DEFAULT 'backlog',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_habits (
      user_id TEXT,
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      checked INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_goals (
      user_id TEXT,
      id TEXT PRIMARY KEY NOT NULL,
      bucket TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_metrics (
      user_id TEXT,
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      target TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_calendar_events (
      user_id TEXT,
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      start_day_key TEXT NOT NULL,
      end_day_key TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'sage',
      notes TEXT NOT NULL DEFAULT '',
      reminder_minutes INTEGER,
      repeat TEXT NOT NULL DEFAULT 'none',
      repeat_end_day_key TEXT,
      created_at_ms INTEGER NOT NULL,
      updated_at_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_calendar_blocks (
      user_id TEXT,
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      color TEXT NOT NULL DEFAULT 'sage',
      notes TEXT NOT NULL DEFAULT '',
      created_at_ms INTEGER NOT NULL,
      updated_at_ms INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_focus_sessions (
      user_id TEXT,
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      task_title TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_daily_snapshots (
      user_id TEXT,
      day_key TEXT PRIMARY KEY NOT NULL,
      focus_seconds INTEGER NOT NULL DEFAULT 0,
      completed_tasks INTEGER NOT NULL DEFAULT 0,
      completed_habits INTEGER NOT NULL DEFAULT 0,
      total_habits INTEGER NOT NULL DEFAULT 0,
      started_before_phone INTEGER NOT NULL DEFAULT 0,
      avoided_scrolling_before_work INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_daily_history (
      user_id TEXT,
      day_key TEXT PRIMARY KEY NOT NULL,
      captured_at INTEGER NOT NULL,
      hardest_task TEXT NOT NULL DEFAULT '',
      first_step TEXT NOT NULL DEFAULT '',
      journal TEXT NOT NULL DEFAULT '',
      monthly_journal TEXT NOT NULL DEFAULT '',
      tasks TEXT NOT NULL DEFAULT '[]',
      habits TEXT NOT NULL DEFAULT '[]',
      metrics TEXT NOT NULL DEFAULT '[]',
      goals TEXT NOT NULL DEFAULT '{}',
      snapshot TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}
