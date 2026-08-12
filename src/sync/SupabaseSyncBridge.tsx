import { useEffect, useRef, useState } from "react";
import { AppState as NativeAppState } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { normalizeStoredState } from "../model/storage";
import { DAY_MODULE_IDS, type DayModuleId, useExecutionStore } from "../store/executionStore";
import { fetchCloudAppState } from "./cloudState";
import {
  getSyncDeviceId,
  pushCloudDelta,
  REALTIME_TABLES,
  reconcileInitialState,
  type SyncSnapshot,
} from "./deltaSync";

function normalizeCloudDayModules(value: unknown): DayModuleId[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const filtered = value.filter((item): item is DayModuleId => DAY_MODULE_IDS.includes(item as DayModuleId));
  return filtered.length > 0 ? filtered : undefined;
}

function currentSnapshot(): SyncSnapshot {
  const current = useExecutionStore.getState();
  return { state: current.state, dayModules: current.dayModules };
}

export function SupabaseSyncBridge() {
  const { isConfigured, session } = useAuth();
  const hydrated = useExecutionStore((store) => store.hydrated);
  const state = useExecutionStore((store) => store.state);
  const dayModules = useExecutionStore((store) => store.dayModules);
  const replaceStateFromCloud = useExecutionStore((store) => store.replaceStateFromCloud);

  const [syncVersion, setSyncVersion] = useState(0);
  const activeUserIdRef = useRef<string | null>(null);
  const baselineRef = useRef<SyncSnapshot | null>(null);
  const applyingCloudRef = useRef(false);
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSnapshotRef = useRef<SyncSnapshot | null>(null);

  useEffect(() => {
    const userId = session?.user.id ?? null;
    if (activeUserIdRef.current === userId) {
      return;
    }

    activeUserIdRef.current = userId;
    baselineRef.current = null;
    applyingCloudRef.current = false;
    uploadQueueRef.current = Promise.resolve();
    pendingSnapshotRef.current = null;
    setSyncVersion(0);
  }, [session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!isConfigured || !userId || !hydrated || syncVersion > 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const deviceId = await getSyncDeviceId();
        const local = currentSnapshot();
        const cloudResult = await fetchCloudAppState(userId);
        if (cancelled) {
          return;
        }

        if (!cloudResult) {
          await pushCloudDelta(userId, null, local, deviceId);
          baselineRef.current = local;
        } else {
          const cloud: SyncSnapshot = {
            state: normalizeStoredState(JSON.stringify(cloudResult.state)),
            dayModules: normalizeCloudDayModules(cloudResult.day_modules) ?? local.dayModules,
          };
          const merged = reconcileInitialState(local, cloud, cloudResult.deleted_ids);

          applyingCloudRef.current = true;
          replaceStateFromCloud(merged.state, merged.dayModules);
          await pushCloudDelta(userId, cloud, merged, deviceId);
          baselineRef.current = merged;
          setTimeout(() => {
            applyingCloudRef.current = false;
          }, 0);
        }

        if (!cancelled) {
          setSyncVersion((value) => value + 1);
        }
      } catch (error) {
        console.warn("Supabase initial sync failed", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, isConfigured, replaceStateFromCloud, session?.user.id, syncVersion]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!isConfigured || !userId || !hydrated || syncVersion === 0 || applyingCloudRef.current) {
      return;
    }

    const next: SyncSnapshot = { state, dayModules };
    const previous = baselineRef.current;
    if (previous && previous.state === next.state && previous.dayModules === next.dayModules) {
      return;
    }

    pendingSnapshotRef.current = next;
    const timeout = setTimeout(() => {
      uploadQueueRef.current = uploadQueueRef.current
        .catch(() => {})
        .then(async () => {
          if (pendingSnapshotRef.current !== next) {
            return;
          }
          const deviceId = await getSyncDeviceId();
          await pushCloudDelta(userId, baselineRef.current, next, deviceId);
          baselineRef.current = next;
          pendingSnapshotRef.current = null;
        })
        .catch((error) => {
          console.warn("Supabase delta sync failed", error);
          throw error;
        });
    }, 700);

    return () => clearTimeout(timeout);
  }, [dayModules, hydrated, isConfigured, session?.user.id, state, syncVersion]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!supabase || !userId || syncVersion === 0) {
      return;
    }
    const client = supabase;

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshFromCloud = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      refreshTimer = setTimeout(() => {
        void uploadQueueRef.current
          .catch(() => {})
          .then(async () => {
            const pending = pendingSnapshotRef.current;
            if (pending) {
              const deviceId = await getSyncDeviceId();
              await pushCloudDelta(userId, baselineRef.current, pending, deviceId);
              baselineRef.current = pending;
              pendingSnapshotRef.current = null;
            }
            const cloudResult = await fetchCloudAppState(userId);
            if (!cloudResult || cancelled) {
              return;
            }

            const current = currentSnapshot();
            const cloud: SyncSnapshot = {
              state: normalizeStoredState(JSON.stringify(cloudResult.state)),
              dayModules: normalizeCloudDayModules(cloudResult.day_modules) ?? current.dayModules,
            };
            applyingCloudRef.current = true;
            baselineRef.current = cloud;
            replaceStateFromCloud(cloud.state, cloud.dayModules);
            setTimeout(() => {
              applyingCloudRef.current = false;
            }, 0);
          })
          .catch((error) => console.warn("Supabase realtime refresh failed", error));
      }, 250);
    };

    let channel = client.channel(`regimen-sync:${userId}`);
    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        refreshFromCloud,
      );
    }
    channel.subscribe();

    const appStateSubscription = NativeAppState.addEventListener("change", (status) => {
      if (status !== "active") {
        return;
      }
      if (!client.realtime.isConnected()) {
        client.realtime.connect();
      }
      refreshFromCloud();
    });

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      appStateSubscription.remove();
      void client.removeChannel(channel);
    };
  }, [replaceStateFromCloud, session?.user.id, syncVersion]);

  return null;
}
