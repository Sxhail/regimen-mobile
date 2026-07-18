import React from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppText as Text } from "../ui/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, Maximize2, Pause, Play, Square, X } from "lucide-react-native";

import { formatSeconds } from "../model/time";
import type { PomodoroConfig } from "../model/types";
import {
  useActiveCalendarEvent,
  useActiveTask,
  useAppState,
  useTimerDisplaySeconds,
  useTodayFocusSeconds,
} from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, AppTextInput, IconButton, MutedLabel, Row, SegmentedControl } from "../ui/primitives";

function getStartLabel(state: ReturnType<typeof useAppState>) {
  if (state.timerMode !== "pomodoro") {
    return state.sessionSeconds > 0 ? "Resume" : "Start timer";
  }

  if (state.pomodoroCompletedFocusBlocks >= state.pomodoroConfig.rounds && state.pomodoroPhase === "focus") {
    return "Start next cycle";
  }

  if (state.pomodoroPhase === "break") {
    return "Start break";
  }

  return "Start focus";
}

function PomodoroConfigRow({ configKey, label }: { configKey: keyof PomodoroConfig; label: string }) {
  const { tokens } = useTheme();
  const value = useExecutionStore((store) => store.state.pomodoroConfig[configKey]);
  const updatePomodoroConfig = useExecutionStore((store) => store.updatePomodoroConfig);

  return (
    <Row style={{ justifyContent: "space-between" }}>
      <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>{label}</Text>
      <Row gap={8}>
        <IconButton onPress={() => updatePomodoroConfig(configKey, value - 1)} accessibilityLabel={`Decrease ${label}`}>
          <Text style={{ color: tokens.text, fontSize: 16, fontWeight: "700" }}>−</Text>
        </IconButton>
        <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "700", minWidth: 32, textAlign: "center", fontVariant: ["tabular-nums"] }}>
          {value}
        </Text>
        <IconButton onPress={() => updatePomodoroConfig(configKey, value + 1)} accessibilityLabel={`Increase ${label}`}>
          <Text style={{ color: tokens.text, fontSize: 16, fontWeight: "700" }}>+</Text>
        </IconButton>
      </Row>
    </Row>
  );
}

export function FloatingTimer() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const state = useAppState();
  const activeTask = useActiveTask();
  const activeCalendarEvent = useActiveCalendarEvent();
  const timerDisplaySeconds = useTimerDisplaySeconds();
  const todayFocusSeconds = useTodayFocusSeconds();

  const startFocus = useExecutionStore((store) => store.startFocus);
  const pauseTimer = useExecutionStore((store) => store.pauseTimer);
  const stopTimer = useExecutionStore((store) => store.stopTimer);
  const setTimerMode = useExecutionStore((store) => store.setTimerMode);
  const setTimerExpanded = useExecutionStore((store) => store.setTimerExpanded);
  const setShowFloatingTimer = useExecutionStore((store) => store.setShowFloatingTimer);
  const dismissTimerAlert = useExecutionStore((store) => store.dismissTimerAlert);
  const updateTaskNotes = useExecutionStore((store) => store.updateTaskNotes);
  const updateCalendarEvent = useExecutionStore((store) => store.updateCalendarEvent);

  if (!state.showFloatingTimer) {
    return null;
  }

  const activeTitle = activeCalendarEvent?.title ?? activeTask?.title ?? "Focus";
  const modeLabel = activeCalendarEvent
    ? "Agenda event"
    : state.timerMode === "pomodoro"
      ? `Pomodoro · ${state.pomodoroPhase === "focus" ? "Focus" : "Break"}`
      : "Free focus";
  const timeLabel = formatSeconds(timerDisplaySeconds);
  const tabBarOffset = 56 + insets.bottom;

  if (!state.timerExpanded) {
    return (
      <View
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: tabBarOffset + 8,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: tokens.borderStrong,
          backgroundColor: tokens.surfaceStrong,
          padding: 12,
          gap: 8,
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        {state.timerAlert ? (
          <Row style={{ justifyContent: "space-between", backgroundColor: tokens.accentSubtle, borderRadius: 12, padding: 8 }}>
            <Text style={{ color: tokens.text, fontSize: 12, flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{state.timerAlert.title}. </Text>
              {state.timerAlert.message}
            </Text>
            <Pressable onPress={dismissTimerAlert} hitSlop={8}>
              <X size={14} color={tokens.textMuted} />
            </Pressable>
          </Row>
        ) : null}
        <Row gap={10}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
              {activeTitle}
            </Text>
            <Text style={{ color: tokens.textMuted, fontSize: 11 }}>{modeLabel}</Text>
          </View>
          <Text style={{ color: tokens.text, fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{timeLabel}</Text>
          {state.isRunning ? (
            <IconButton onPress={pauseTimer} accessibilityLabel="Pause">
              <Pause size={16} color={tokens.accent} />
            </IconButton>
          ) : (
            <IconButton onPress={startFocus} accessibilityLabel="Start">
              <Play size={16} color={tokens.accent} />
            </IconButton>
          )}
          <IconButton onPress={() => setTimerExpanded(true)} accessibilityLabel="Expand timer">
            <Maximize2 size={15} color={tokens.textSecondary} />
          </IconButton>
          <IconButton onPress={() => setShowFloatingTimer(false)} accessibilityLabel="Hide timer">
            <X size={15} color={tokens.textMuted} />
          </IconButton>
        </Row>
      </View>
    );
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: tokens.bg,
        paddingTop: insets.top + 14,
      }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: "space-between" }}>
          <MutedLabel>Focus timer</MutedLabel>
          <IconButton onPress={() => setTimerExpanded(false)} accessibilityLabel="Collapse timer">
            <ChevronDown size={18} color={tokens.textSecondary} />
          </IconButton>
        </Row>

        {state.timerAlert ? (
          <View style={{ backgroundColor: tokens.accentSubtle, borderRadius: 16, padding: 14, gap: 8 }}>
            <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "700" }}>{state.timerAlert.title}</Text>
            <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>{state.timerAlert.message}</Text>
            <AppButton label="Dismiss" small variant="outline" onPress={dismissTimerAlert} style={{ alignSelf: "flex-start" }} />
          </View>
        ) : null}

        <View style={{ alignItems: "center", gap: 8, paddingVertical: 16 }}>
          <Text style={{ color: tokens.textSecondary, fontSize: 15, fontWeight: "600" }} numberOfLines={2}>
            {activeTitle}
          </Text>
          <Text style={{ color: tokens.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 2 }}>{modeLabel}</Text>
          <Text style={{ color: tokens.text, fontSize: 64, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{timeLabel}</Text>
          {state.timerMode === "pomodoro" ? (
            <Text style={{ color: tokens.textMuted, fontSize: 13 }}>
              Rounds {Math.min(state.pomodoroCompletedFocusBlocks, state.pomodoroConfig.rounds)}/{state.pomodoroConfig.rounds}
            </Text>
          ) : null}
        </View>

        <Row gap={10} style={{ justifyContent: "center" }}>
          {state.isRunning ? (
            <AppButton label="Pause" onPress={pauseTimer} icon={<Pause size={15} color={tokens.onAccent} />} />
          ) : (
            <AppButton label={getStartLabel(state)} onPress={startFocus} icon={<Play size={15} color={tokens.onAccent} />} />
          )}
          <AppButton label="Stop" variant="danger" onPress={stopTimer} icon={<Square size={14} color={tokens.danger} />} />
        </Row>

        <View style={{ gap: 8 }}>
          <MutedLabel>Timer mode</MutedLabel>
          <SegmentedControl
            options={[
              { value: "free", label: "Free" },
              { value: "pomodoro", label: "Pomodoro" },
            ]}
            value={state.timerMode}
            onChange={setTimerMode}
          />
        </View>

        {state.timerMode === "pomodoro" ? (
          <View style={{ gap: 10 }}>
            <MutedLabel>Pomodoro config</MutedLabel>
            <PomodoroConfigRow configKey="workMinutes" label="Focus minutes" />
            <PomodoroConfigRow configKey="breakMinutes" label="Break minutes" />
            <PomodoroConfigRow configKey="rounds" label="Rounds" />
          </View>
        ) : null}

        <Row style={{ justifyContent: "space-between" }}>
          <MutedLabel>Today total</MutedLabel>
          <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
            {formatSeconds(todayFocusSeconds)}
          </Text>
        </Row>

        {activeTask || activeCalendarEvent ? (
          <View style={{ gap: 8 }}>
            <MutedLabel>Working notes</MutedLabel>
            <AppTextInput
              placeholder="Notes while you work"
              value={activeCalendarEvent ? activeCalendarEvent.notes : activeTask?.notes ?? ""}
              onChangeText={(value) => {
                if (activeCalendarEvent) {
                  updateCalendarEvent(activeCalendarEvent.id, { notes: value });
                } else if (activeTask) {
                  updateTaskNotes(activeTask.id, value);
                }
              }}
              multiline
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
