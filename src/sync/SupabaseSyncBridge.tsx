import { useEffect, useRef } from "react";

import { useAuth } from "../auth/AuthProvider";
import { normalizeStoredState } from "../model/storage";
import { DAY_MODULE_IDS, type DayModuleId, useExecutionStore } from "../store/executionStore";
import { fetchCloudAppState, upsertCloudAppState } from "./cloudState";

function normalizeCloudDayModules(value: unknown): DayModuleId[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const filtered = value.filter((item): item is DayModuleId => DAY_MODULE_IDS.includes(item as DayModuleId));
  return filtered.length > 0 ? filtered : undefined;
}

export function SupabaseSyncBridge() {
  const { isConfigured, session } = useAuth();
  const hydrated = useExecutionStore((store) => store.hydrated);
  const state = useExecutionStore((store) => store.state);
  const dayModules = useExecutionStore((store) => store.dayModules);
  const replaceStateFromCloud = useExecutionStore((store) => store.replaceStateFromCloud);

  const activeUserIdRef = useRef<string | null>(null);
  const initialSyncDoneRef = useRef(false);
  const applyingCloudRef = useRef(false);

  useEffect(() => {
    const userId = session?.user.id ?? null;
    if (activeUserIdRef.current === userId) {
      return;
    }

    activeUserIdRef.current = userId;
    initialSyncDoneRef.current = false;
    applyingCloudRef.current = false;
  }, [session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!isConfigured || !userId || !hydrated || initialSyncDoneRef.current) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const cloudState = await fetchCloudAppState(userId);
        if (cancelled) {
          return;
        }

        if (cloudState) {
          const normalizedState = normalizeStoredState(JSON.stringify(cloudState.state));
          const normalizedDayModules = normalizeCloudDayModules(cloudState.day_modules);
          applyingCloudRef.current = true;
          replaceStateFromCloud(normalizedState, normalizedDayModules);
          setTimeout(() => {
            applyingCloudRef.current = false;
          }, 0);
        } else {
          const current = useExecutionStore.getState();
          await upsertCloudAppState(userId, current.state, current.dayModules);
        }

        if (!cancelled) {
          initialSyncDoneRef.current = true;
        }
      } catch (error) {
        console.warn("Supabase initial sync failed", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, isConfigured, replaceStateFromCloud, session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!isConfigured || !userId || !hydrated || !initialSyncDoneRef.current || applyingCloudRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      upsertCloudAppState(userId, state, dayModules).catch((error) => {
        console.warn("Supabase state sync failed", error);
      });
    }, 900);

    return () => clearTimeout(timeout);
  }, [dayModules, hydrated, isConfigured, session?.user.id, state]);

  return null;
}
