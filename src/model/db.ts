import { getDb, initializeRowSchema } from "./schema";

let initPromise: Promise<void> | null = null;

async function ensureDbReady() {
  if (!initPromise) {
    initPromise = initializeRowSchema();
    initPromise.catch(() => {
      initPromise = null;
    });
  }

  await initPromise;
}

export async function kvGet(key: string): Promise<string | null> {
  await ensureDbReady();
  const db = await getDb();

  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM kv WHERE key = ?",
    key,
  );

  return row ? row.value : null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  await ensureDbReady();
  const db = await getDb();

  await db.runAsync(
    "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}
