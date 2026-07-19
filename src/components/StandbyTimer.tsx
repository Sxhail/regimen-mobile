import React, { useEffect, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { useKeepAwake } from "expo-keep-awake";
import { Lock, LockOpen } from "lucide-react-native";

import { AppText as Text } from "../ui/AppText";
import { formatSeconds } from "../model/time";
import { useActiveCalendarEvent, useActiveTask, useAppState, useTimerDisplaySeconds } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";

// iOS-StandBy-style full-screen timer. The app is normally locked to portrait;
// while the timer runs we unlock rotation, and turning the phone landscape
// swaps the whole app for this minimal screen. The lock button pins standby on
// so it survives rotating back (or putting the phone down) until unlocked.

function isLandscapeOrientation(orientation: ScreenOrientation.Orientation | null) {
  return (
    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
    orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  );
}

function StandbyFace({ locked, onToggleLock }: { locked: boolean; onToggleLock: () => void }) {
  useKeepAwake();

  const { tokens } = useTheme();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const state = useAppState();
  const activeTask = useActiveTask();
  const activeCalendarEvent = useActiveCalendarEvent();
  const timeLabel = formatSeconds(useTimerDisplaySeconds());

  const activeTitle = activeCalendarEvent?.title ?? activeTask?.title ?? null;
  const modeLabel = activeCalendarEvent
    ? "Agenda event"
    : state.timerMode === "pomodoro"
      ? state.pomodoroPhase === "focus"
        ? "Focus"
        : "Break"
      : "Free focus";
  const roundsLabel =
    state.timerMode === "pomodoro" && !activeCalendarEvent
      ? `Round ${Math.min(state.pomodoroCompletedFocusBlocks + (state.pomodoroPhase === "focus" ? 1 : 0), state.pomodoroConfig.rounds)}/${state.pomodoroConfig.rounds}`
      : null;

  // Scale the digits to the screen; HH:MM:SS needs a smaller size than MM:SS.
  const digitSize = Math.min(landscape ? height * 0.52 : width * 0.3, (width * (landscape ? 0.66 : 0.9)) / (timeLabel.length * 0.62));

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        backgroundColor: tokens.bg,
        flexDirection: landscape ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: landscape ? 28 : 12,
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          color: tokens.accent,
          fontSize: digitSize,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
          includeFontPadding: false,
        }}
        numberOfLines={1}
      >
        {timeLabel}
      </Text>

      <View style={{ alignItems: landscape ? "flex-start" : "center", gap: 6, maxWidth: landscape ? width * 0.28 : undefined }}>
        <Text style={{ color: tokens.text, fontSize: 20, fontWeight: "700", textTransform: "uppercase", letterSpacing: 3 }}>
          {modeLabel}
        </Text>
        {roundsLabel ? (
          <Text style={{ color: tokens.textSecondary, fontSize: 15, fontVariant: ["tabular-nums"] }}>{roundsLabel}</Text>
        ) : null}
        {activeTitle ? (
          <Text style={{ color: tokens.textMuted, fontSize: 13 }} numberOfLines={2}>
            {activeTitle}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={onToggleLock}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel={locked ? "Unlock standby mode" : "Lock standby mode"}
        style={({ pressed }) => ({
          position: "absolute",
          top: landscape ? 18 : 54,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: locked ? tokens.accent : tokens.border,
          backgroundColor: locked ? tokens.accentSubtle : "transparent",
          opacity: pressed ? 0.6 : 0.9,
        })}
      >
        {locked ? <Lock size={17} color={tokens.accent} /> : <LockOpen size={17} color={tokens.textMuted} />}
      </Pressable>
    </View>
  );
}

export function StandbyTimer() {
  const isRunning = useExecutionStore((store) => store.state.isRunning);

  const [orientation, setOrientation] = useState<ScreenOrientation.Orientation | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    ScreenOrientation.getOrientationAsync()
      .then((value) => {
        if (mounted) {
          setOrientation(value);
        }
      })
      .catch(() => {});

    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      setOrientation(event.orientationInfo.orientation);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Portrait-only app by default; rotation is allowed only while a focus
  // session is running so landscape can enter standby.
  useEffect(() => {
    if (isRunning) {
      ScreenOrientation.unlockAsync().catch(() => {});
      return;
    }

    setLocked(false);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, [isRunning]);

  const standbyActive = isRunning && (locked || isLandscapeOrientation(orientation));

  if (!standbyActive) {
    return null;
  }

  return <StandbyFace locked={locked} onToggleLock={() => setLocked((value) => !value)} />;
}
