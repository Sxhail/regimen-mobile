import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Pencil, Trash2 } from "lucide-react-native";

import { getDayKey } from "../model/defaults";
import { addDays } from "../model/time";
import type { Habit } from "../model/types";
import { useAppState, useDaysWon, useMonthlyFocusMinutes, useWeeklyFocusMinutes, useWeeklyPoints } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, AppTextInput, Card, EmptyState, IconButton, MutedLabel, Row, SegmentedControl, StatTile } from "../ui/primitives";
import { ScreenHeader } from "../components/ScreenHeader";

type StatsRange = "month" | "quarter" | "year";

const RANGE_DAYS: Record<StatsRange, number> = { month: 30, quarter: 90, year: 365 };

function minutesToHeight(minutes: number) {
  return Math.max(12, Math.min(160, Math.round(minutes * 0.9)));
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

function HabitHeatmapCard({ habit, index, range }: { habit: Habit; index: number; range: StatsRange }) {
  const { tokens, habitPalette } = useTheme();
  const state = useAppState();
  const saveHabitEdit = useExecutionStore((store) => store.saveHabitEdit);
  const deleteHabit = useExecutionStore((store) => store.deleteHabit);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(habit.label);

  const palette = habitPalette[index % habitPalette.length];
  const todayKey = state.currentDayKey;

  const { cells, currentStreak, completions, totalDays } = useMemo(() => {
    const days = RANGE_DAYS[range];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkedByDay = new Map<string, boolean>();
    for (const [dayKey, entry] of Object.entries(state.dailyHistory)) {
      const archived = entry.habits.find((item) => item.id === habit.id);
      if (archived) {
        checkedByDay.set(dayKey, archived.checked);
      }
    }
    checkedByDay.set(todayKey, habit.checked);

    const cellList: Array<{ dayKey: string; checked: boolean; isToday: boolean }> = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const dayKey = getDayKey(addDays(today, -offset));
      cellList.push({ dayKey, checked: checkedByDay.get(dayKey) ?? false, isToday: dayKey === todayKey });
    }

    let streak = 0;
    for (let offset = 0; ; offset += 1) {
      const dayKey = getDayKey(addDays(today, -offset));
      if (checkedByDay.get(dayKey)) {
        streak += 1;
      } else {
        break;
      }
    }

    const done = cellList.filter((cell) => cell.checked).length;
    return { cells: cellList, currentStreak: streak, completions: done, totalDays: days };
  }, [habit, range, state.dailyHistory, todayKey]);

  const completionRate = Math.round((completions / totalDays) * 100);

  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        {editing ? (
          <AppTextInput
            value={label}
            onChangeText={setLabel}
            autoFocus
            onBlur={() => {
              saveHabitEdit(habit.id, label);
              setEditing(false);
            }}
            onSubmitEditing={() => {
              saveHabitEdit(habit.id, label);
              setEditing(false);
            }}
            style={{ flex: 1 }}
          />
        ) : (
          <Text style={{ color: palette.accent, fontSize: 15, fontWeight: "700", flex: 1 }}>{habit.label}</Text>
        )}
        <Row gap={6}>
          <IconButton onPress={() => setEditing(true)} accessibilityLabel="Rename habit">
            <Pencil size={13} color={tokens.textMuted} />
          </IconButton>
          <IconButton onPress={() => deleteHabit(habit.id)} accessibilityLabel="Delete habit">
            <Trash2 size={13} color={tokens.danger} />
          </IconButton>
        </Row>
      </Row>

      <Row gap={8}>
        <View style={{ backgroundColor: palette.badgeBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: palette.badgeText, fontSize: 12, fontWeight: "700" }}>{currentStreak} day streak</Text>
        </View>
        <Text style={{ color: tokens.textMuted, fontSize: 12 }}>
          {completionRate}% · {completions}/{totalDays} days
        </Text>
      </Row>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
        {cells.map((cell) => (
          <View
            key={cell.dayKey}
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: cell.checked ? palette.tileOn : tokens.inputBg,
              borderWidth: cell.isToday ? 1.5 : 0.5,
              borderColor: cell.isToday ? palette.accent : tokens.border,
            }}
          />
        ))}
      </View>
    </Card>
  );
}

export function StatsScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const state = useAppState();
  const weeklyPoints = useWeeklyPoints();
  const daysWon = useDaysWon();
  const weeklyFocusMinutes = useWeeklyFocusMinutes();
  const monthlyFocusMinutes = useMonthlyFocusMinutes();
  const addHabit = useExecutionStore((store) => store.addHabit);

  const [range, setRange] = useState<StatsRange>("month");
  const [newHabit, setNewHabit] = useState("");

  const longestDayMinutes = Math.max(0, ...weeklyPoints.map((point) => point.focus));
  const hasFocusData = weeklyPoints.some((point) => point.focus > 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={{ padding: 18, paddingTop: insets.top + 10, paddingBottom: 140, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader title="Stats" subtitle="Focus output and habit streaks." />

      <Card style={{ gap: 14 }}>
        <MutedLabel>Focus by day</MutedLabel>
        {!hasFocusData ? (
          <EmptyState message="No focus sessions logged yet this week." />
        ) : (
          <Row style={{ alignItems: "flex-end", justifyContent: "space-between" }} gap={6}>
            {weeklyPoints.map((point, index) => (
              <View key={`${point.day}-${index}`} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    width: "72%",
                    height: minutesToHeight(point.focus),
                    borderRadius: 8,
                    backgroundColor: tokens.accent,
                    opacity: point.won ? 1 : 0.45,
                  }}
                />
                <Text style={{ color: tokens.textMuted, fontSize: 11 }}>{point.day}</Text>
                <Text style={{ color: tokens.textSecondary, fontSize: 11, fontVariant: ["tabular-nums"] }}>
                  {formatHours(point.focus)}
                </Text>
              </View>
            ))}
          </Row>
        )}
      </Card>

      <Row gap={12}>
        <StatTile label="This week" value={formatHours(weeklyFocusMinutes)} hint="Focus time" />
        <StatTile label="This month" value={formatHours(monthlyFocusMinutes)} hint="Focus time" />
      </Row>
      <Row gap={12}>
        <StatTile label="Days won" value={`${daysWon}/7`} hint="Last 7 days" />
        <StatTile label="Longest day" value={formatHours(longestDayMinutes)} hint="This week" />
      </Row>

      <Card style={{ gap: 14 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <MutedLabel>Habit streaks</MutedLabel>
          <AppButton label="Life calendar" small variant="ghost" onPress={() => router.push("/life")} />
        </Row>
        <SegmentedControl
          options={[
            { value: "month", label: "Monthly" },
            { value: "quarter", label: "3 months" },
            { value: "year", label: "Yearly" },
          ]}
          value={range}
          onChange={setRange}
        />
        <Row gap={8}>
          <AppTextInput
            placeholder="Add a habit"
            value={newHabit}
            onChangeText={setNewHabit}
            onSubmitEditing={() => {
              addHabit(newHabit);
              setNewHabit("");
            }}
            style={{ flex: 1 }}
          />
          <AppButton
            label="Add"
            small
            onPress={() => {
              addHabit(newHabit);
              setNewHabit("");
            }}
          />
        </Row>
      </Card>

      {state.habits.length === 0 ? (
        <EmptyState message="Add habits to start building streak history." />
      ) : (
        state.habits.map((habit, index) => <HabitHeatmapCard key={habit.id} habit={habit} index={index} range={range} />)
      )}
    </ScrollView>
  );
}
