import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppText as Text } from "../ui/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Check, ChevronRight, Pause, Play, SlidersHorizontal } from "lucide-react-native";

import { formatSeconds } from "../model/time";
import {
  useActiveCalendarEvent,
  useAppState,
  useCompletedAgendaIds,
  useCompletedHabitsCount,
  useCompletedTasksCount,
  useTodayAgenda,
  useTodayFocusSeconds,
} from "../store/derived";
import { DAY_MODULE_IDS, useExecutionStore, type DayModuleId } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, AppTextInput, Card, CheckCircle, EmptyState, MutedLabel, Row, Sheet, StatTile, SwitchRow } from "../ui/primitives";
import { ScreenHeader } from "../components/ScreenHeader";

const DAY_MODULE_LABELS: Record<DayModuleId, string> = {
  agenda: "Today's agenda",
  next: "Up next",
  inProgress: "In-progress tasks",
  goals: "Goals preview",
  habits: "Habits",
  stats: "Focus stats",
  principles: "Principles",
  inputs: "Custom inputs",
};

export function TodayScreen() {
  const { tokens, eventColors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const state = useAppState();
  const todayAgenda = useTodayAgenda();
  const completedAgendaIds = useCompletedAgendaIds();
  const activeCalendarEvent = useActiveCalendarEvent();
  const todayFocusSeconds = useTodayFocusSeconds();
  const completedTasks = useCompletedTasksCount();
  const completedHabits = useCompletedHabitsCount();

  const dayModules = useExecutionStore((store) => store.dayModules);
  const toggleDayModule = useExecutionStore((store) => store.toggleDayModule);
  const startCalendarEvent = useExecutionStore((store) => store.startCalendarEvent);
  const startTask = useExecutionStore((store) => store.startTask);
  const pauseTimer = useExecutionStore((store) => store.pauseTimer);
  const toggleHabit = useExecutionStore((store) => store.toggleHabit);
  const updateMetric = useExecutionStore((store) => store.updateMetric);

  const [customizeOpen, setCustomizeOpen] = useState(false);

  const nextAgendaEvent = useMemo(() => {
    if (activeCalendarEvent) {
      return activeCalendarEvent;
    }
    return todayAgenda.find((event) => !completedAgendaIds.has(event.id)) ?? null;
  }, [activeCalendarEvent, todayAgenda, completedAgendaIds]);

  const isNextEventRunning = Boolean(
    nextAgendaEvent && state.isRunning && state.activeCalendarEventId === nextAgendaEvent.id,
  );

  const enabled = (module: DayModuleId) => dayModules.includes(module);
  const gap = state.compactMode ? 8 : 12;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={{ padding: 18, paddingTop: insets.top + 10, paddingBottom: 140, gap }}
    >
      <ScreenHeader title="Today" />

      <AppButton
        label="Customize"
        variant="outline"
        small
        icon={<SlidersHorizontal size={14} color={tokens.text} />}
        onPress={() => setCustomizeOpen(true)}
        style={{ alignSelf: "flex-start" }}
      />

      {enabled("next") ? (
        <Card style={{ gap: 12 }}>
          <MutedLabel>{isNextEventRunning ? "In progress" : "Up next"}</MutedLabel>
          {nextAgendaEvent ? (
            <>
              <Text style={{ color: tokens.text, fontSize: 22, fontWeight: "700" }}>{nextAgendaEvent.title}</Text>
              <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>
                {nextAgendaEvent.startTime} – {nextAgendaEvent.endTime}
                {nextAgendaEvent.notes ? ` · ${nextAgendaEvent.notes}` : ""}
              </Text>
              {isNextEventRunning ? (
                <AppButton
                  label="Pause"
                  onPress={pauseTimer}
                  icon={<Pause size={15} color={tokens.onAccent} />}
                  style={{ alignSelf: "flex-start" }}
                />
              ) : (
                <AppButton
                  label="Start task"
                  onPress={() => startCalendarEvent(nextAgendaEvent.id)}
                  icon={<Play size={15} color={tokens.onAccent} />}
                  style={{ alignSelf: "flex-start" }}
                />
              )}
            </>
          ) : (
            <Text style={{ color: tokens.textMuted, fontSize: 14 }}>
              Your agenda is clear. Add a time block in Planner.
            </Text>
          )}
        </Card>
      ) : null}

      {enabled("inProgress") ? (
        <Card style={{ gap: 12 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <MutedLabel>In progress</MutedLabel>
            <Pressable onPress={() => router.push("/tasks" as Href)} hitSlop={8}>
              <Row gap={2}>
                <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: "600" }}>Tasks</Text>
                <ChevronRight size={14} color={tokens.accent} />
              </Row>
            </Pressable>
          </Row>
          {state.tasks.filter((task) => !task.completed && task.kanbanStatus === "in_progress").length === 0 ? (
            <EmptyState message="No tasks in progress." />
          ) : (
            state.tasks.filter((task) => !task.completed && task.kanbanStatus === "in_progress").map((task) => (
              <Row key={task.id} style={{ alignItems: "center" }} gap={10}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>{task.title}</Text>
                  <Text style={{ color: tokens.textMuted, fontSize: 12 }}>{formatSeconds(task.secondsSpent)}</Text>
                </View>
                <AppButton label={state.activeTaskId === task.id ? "Resume" : "Start"} small variant="outline" onPress={() => startTask(task.id)} />
              </Row>
            ))
          )}
        </Card>
      ) : null}

      {enabled("agenda") ? (
        <Card style={{ gap: 12 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <MutedLabel>Today's agenda</MutedLabel>
            <Pressable onPress={() => router.push("/planner")} hitSlop={8}>
              <Row gap={2}>
                <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: "600" }}>Planner</Text>
                <ChevronRight size={14} color={tokens.accent} />
              </Row>
            </Pressable>
          </Row>
          {todayAgenda.length === 0 ? (
            <EmptyState message="Nothing planned for today yet." />
          ) : (
            todayAgenda.map((event, index) => {
              const done = completedAgendaIds.has(event.id);
              const palette = eventColors[event.color];
              return (
                <Row key={event.id} style={{ alignItems: "center" }} gap={12}>
                  <View style={{ width: 44 }}>
                    <Text style={{ color: tokens.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] }}>{event.startTime}</Text>
                  </View>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: done ? palette.base : palette.soft,
                    }}
                  >
                    {done ? (
                      <Check size={14} color={palette.onBase} strokeWidth={3} />
                    ) : (
                      <Text style={{ color: palette.softText, fontSize: 12, fontWeight: "700" }}>{index + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: done ? tokens.textMuted : tokens.text,
                        fontSize: 15,
                        fontWeight: "600",
                        textDecorationLine: done ? "line-through" : "none",
                      }}
                    >
                      {event.title}
                    </Text>
                    <Text style={{ color: tokens.textMuted, fontSize: 12 }}>
                      {event.startTime} – {event.endTime}
                    </Text>
                  </View>
                  <AppButton label="Start" small variant="outline" onPress={() => startCalendarEvent(event.id)} />
                </Row>
              );
            })
          )}
        </Card>
      ) : null}

      {enabled("goals") ? (
        <Card style={{ gap: 12 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <MutedLabel>Goals</MutedLabel>
            <Pressable onPress={() => router.push("/goals")} hitSlop={8}>
              <Row gap={2}>
                <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: "600" }}>All goals</Text>
                <ChevronRight size={14} color={tokens.accent} />
              </Row>
            </Pressable>
          </Row>
          {([
            { label: "This Week", bucket: "today" as const },
            { label: "This Month", bucket: "month" as const },
            { label: "Yearly", bucket: "vision" as const },
          ]).map(({ label, bucket }) => (
            <View key={bucket} style={{ gap: 4 }}>
              <Text style={{ color: tokens.textMuted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
              {state.goals[bucket].length === 0 ? (
                <Pressable onPress={() => router.push("/goals")}>
                  <Text style={{ color: tokens.accent, fontSize: 13 }}>+ Add a goal</Text>
                </Pressable>
              ) : (
                state.goals[bucket].slice(0, 3).map((goal) => (
                  <Text key={goal.id} style={{ color: tokens.text, fontSize: 14 }}>
                    · {goal.title}
                  </Text>
                ))
              )}
            </View>
          ))}
        </Card>
      ) : null}

      {enabled("habits") ? (
        <Card style={{ gap: 12 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <MutedLabel>Habits</MutedLabel>
            <Text style={{ color: tokens.textMuted, fontSize: 12 }}>
              {completedHabits}/{state.habits.length} done today
            </Text>
          </Row>
          {state.habits.length === 0 ? (
            <EmptyState message="No habits yet. Add them in Stats." />
          ) : (
            state.habits.map((habit) => (
              <Row key={habit.id} gap={12}>
                <CheckCircle checked={habit.checked} onPress={() => toggleHabit(habit.id)} />
                <Text
                  style={{
                    flex: 1,
                    color: habit.checked ? tokens.textMuted : tokens.text,
                    fontSize: 15,
                    textDecorationLine: habit.checked ? "line-through" : "none",
                  }}
                >
                  {habit.label}
                </Text>
              </Row>
            ))
          )}
        </Card>
      ) : null}

      {enabled("stats") ? (
        <Row gap={12}>
          <StatTile label="Focused" value={formatSeconds(todayFocusSeconds)} />
          <StatTile label="Completed" value={String(completedTasks)} />
        </Row>
      ) : null}

      {enabled("principles") ? (
        <Card style={{ gap: 12 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <MutedLabel>Principles</MutedLabel>
            <Pressable onPress={() => router.push("/principles" as Href)} hitSlop={8}>
              <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: "600" }}>Manage</Text>
            </Pressable>
          </Row>
          {state.principles.length === 0 ? (
            <EmptyState message="No principles yet." />
          ) : (
            state.principles.slice(0, 3).map((principle) => (
              <View key={principle.id} style={{ gap: 2 }}>
                <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>{principle.title}</Text>
                {principle.note ? <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>{principle.note}</Text> : null}
              </View>
            ))
          )}
        </Card>
      ) : null}

      {enabled("inputs") && state.metrics.length > 0 ? (
        <Card style={{ gap: 12 }}>
          <MutedLabel>Custom inputs</MutedLabel>
          {state.metrics.map((metric) => (
            <View key={metric.id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "600" }}>{metric.label}</Text>
                {metric.target ? <Text style={{ color: tokens.textMuted, fontSize: 12 }}>Target: {metric.target}</Text> : null}
              </Row>
              <AppTextInput
                placeholder={metric.type === "time" ? "e.g. 45m" : metric.type === "number" ? "e.g. 12" : "Value"}
                value={metric.value}
                onChangeText={(value) => updateMetric(metric.id, "value", value)}
                keyboardType={metric.type === "number" ? "numeric" : "default"}
              />
            </View>
          ))}
        </Card>
      ) : null}

      <Sheet visible={customizeOpen} onClose={() => setCustomizeOpen(false)} title="Customize dashboard">
        {DAY_MODULE_IDS.map((module) => (
          <SwitchRow
            key={module}
            label={DAY_MODULE_LABELS[module]}
            value={dayModules.includes(module)}
            onValueChange={() => toggleDayModule(module)}
          />
        ))}
      </Sheet>
    </ScrollView>
  );
}
