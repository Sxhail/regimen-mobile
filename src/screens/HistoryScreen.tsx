import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { getDayKey } from "../model/defaults";
import { isSnapshotWon } from "../model/logic";
import { dayKeyToDate, formatDateLabel, formatSeconds } from "../model/time";
import type { DailyHistoryEntry } from "../model/types";
import { useHistoryEntries } from "../store/derived";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, Card, EmptyState, IconButton, MutedLabel, Row, StatTile, Subtitle } from "../ui/primitives";

function HistoryEntryCard({ entry }: { entry: DailyHistoryEntry }) {
  const { tokens } = useTheme();
  const won = isSnapshotWon(entry.snapshot);
  const dateLabel = formatDateLabel(dayKeyToDate(entry.dayKey), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Card style={{ gap: 14 }}>
      <Text style={{ color: tokens.text, fontSize: 17, fontWeight: "700" }}>{dateLabel}</Text>

      <Row gap={10}>
        <StatTile label="Focus" value={formatSeconds(entry.snapshot.focusSeconds)} />
        <StatTile label="Habits" value={String(entry.snapshot.completedHabits)} />
      </Row>
      <Row gap={10}>
        <StatTile label="Tasks done" value={String(entry.snapshot.completedTasks)} />
        <StatTile label="Won day" value={won ? "Yes" : "No"} />
      </Row>

      <View style={{ gap: 6 }}>
        <MutedLabel>Tasks completed</MutedLabel>
        {entry.tasks.length === 0 ? (
          <Text style={{ color: tokens.textMuted, fontSize: 13 }}>No tasks completed.</Text>
        ) : (
          entry.tasks.map((task) => (
            <Row key={task.id} style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: tokens.text, fontSize: 14 }}>{task.title}</Text>
                <Text style={{ color: tokens.textMuted, fontSize: 12 }}>{task.groupTitle}</Text>
              </View>
              <Text style={{ color: tokens.textSecondary, fontSize: 12, fontVariant: ["tabular-nums"] }}>
                {formatSeconds(task.secondsSpent)}
              </Text>
            </Row>
          ))
        )}
      </View>

      <View style={{ gap: 6 }}>
        <MutedLabel>Habits</MutedLabel>
        {entry.habits.map((habit) => (
          <Row key={habit.id} style={{ justifyContent: "space-between" }}>
            <Text style={{ color: tokens.text, fontSize: 14, flex: 1 }}>{habit.label}</Text>
            <Text style={{ color: habit.checked ? tokens.success : tokens.textMuted, fontSize: 12, fontWeight: "600" }}>
              {habit.checked ? "Done" : "Not done"}
            </Text>
          </Row>
        ))}
      </View>

      {entry.metrics.length > 0 ? (
        <View style={{ gap: 6 }}>
          <MutedLabel>Custom inputs</MutedLabel>
          {entry.metrics.map((metric) => (
            <Row key={metric.id} style={{ justifyContent: "space-between" }}>
              <Text style={{ color: tokens.text, fontSize: 14, flex: 1 }}>{metric.label}</Text>
              <Text style={{ color: tokens.textSecondary, fontSize: 12 }}>
                {metric.value || "—"}
                {metric.target ? ` / ${metric.target}` : ""}
              </Text>
            </Row>
          ))}
        </View>
      ) : null}

      {entry.hardestTask ? (
        <View style={{ gap: 4 }}>
          <MutedLabel>Hardest task</MutedLabel>
          <Text style={{ color: tokens.text, fontSize: 14 }}>{entry.hardestTask}</Text>
        </View>
      ) : null}

      {entry.firstStep ? (
        <View style={{ gap: 4 }}>
          <MutedLabel>First step</MutedLabel>
          <Text style={{ color: tokens.text, fontSize: 14 }}>{entry.firstStep}</Text>
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <MutedLabel>Goals snapshot</MutedLabel>
        {([
          { label: "Yearly", bucket: "vision" as const },
          { label: "This Month", bucket: "month" as const },
          { label: "This Week", bucket: "today" as const },
        ]).map(({ label, bucket }) => (
          <View key={bucket} style={{ gap: 2 }}>
            <Text style={{ color: tokens.textMuted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
            {entry.goals[bucket].length === 0 ? (
              <Text style={{ color: tokens.textMuted, fontSize: 13 }}>—</Text>
            ) : (
              entry.goals[bucket].map((goal) => (
                <Text key={goal.id} style={{ color: tokens.text, fontSize: 13 }}>
                  · {goal.title}
                </Text>
              ))
            )}
          </View>
        ))}
      </View>

      {entry.journal ? (
        <View style={{ gap: 4 }}>
          <MutedLabel>Journal</MutedLabel>
          <Text style={{ color: tokens.textSecondary, fontSize: 14, lineHeight: 20 }}>{entry.journal}</Text>
        </View>
      ) : null}

      {entry.monthlyJournal ? (
        <View style={{ gap: 4 }}>
          <MutedLabel>Monthly journal</MutedLabel>
          <Text style={{ color: tokens.textSecondary, fontSize: 14, lineHeight: 20 }}>{entry.monthlyJournal}</Text>
        </View>
      ) : null}
    </Card>
  );
}

export function HistoryScreen() {
  const { tokens } = useTheme();
  const historyEntries = useHistoryEntries();

  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(today.getMonth());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const historyDaySet = useMemo(() => new Set(historyEntries.map((entry) => entry.dayKey)), [historyEntries]);

  const moveMonth = (delta: number) => {
    const next = new Date(calendarYear, calendarMonthIndex + delta, 1);
    setCalendarYear(next.getFullYear());
    setCalendarMonthIndex(next.getMonth());
  };

  const monthLabel = formatDateLabel(new Date(calendarYear, calendarMonthIndex, 1), { month: "long", year: "numeric" });
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();

  const visibleEntries = selectedDayKey
    ? historyEntries.filter((entry) => entry.dayKey === selectedDayKey)
    : historyEntries;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 140, gap: 16 }}
    >
      <Subtitle>When a day rolls over or is reset, it is archived here.</Subtitle>

      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <IconButton onPress={() => moveMonth(-1)} accessibilityLabel="Previous month">
            <ChevronLeft size={16} color={tokens.textSecondary} />
          </IconButton>
          <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "700" }}>{monthLabel}</Text>
          <IconButton onPress={() => moveMonth(1)} accessibilityLabel="Next month">
            <ChevronRight size={16} color={tokens.textSecondary} />
          </IconButton>
        </Row>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
          {Array.from({ length: daysInMonth }, (_, index) => {
            const dayKey = getDayKey(new Date(calendarYear, calendarMonthIndex, index + 1));
            const hasEntry = historyDaySet.has(dayKey);
            const selected = selectedDayKey === dayKey;
            return (
              <Pressable
                key={dayKey}
                disabled={!hasEntry}
                onPress={() => setSelectedDayKey(selected ? null : dayKey)}
                style={{
                  width: 40,
                  height: 36,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderStyle: hasEntry ? "solid" : "dashed",
                  borderColor: selected ? tokens.accent : tokens.border,
                  backgroundColor: selected ? tokens.accentSubtle : "transparent",
                  opacity: hasEntry ? 1 : 0.4,
                }}
              >
                <Text
                  style={{
                    color: hasEntry ? tokens.text : tokens.textMuted,
                    fontSize: 13,
                    fontWeight: hasEntry ? "700" : "400",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {index + 1}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedDayKey ? (
          <AppButton label="View all" small variant="outline" onPress={() => setSelectedDayKey(null)} style={{ alignSelf: "flex-start" }} />
        ) : null}
      </Card>

      {visibleEntries.length === 0 ? (
        <EmptyState
          message={
            selectedDayKey
              ? `No data recorded for ${selectedDayKey}.`
              : "No history yet. Once a day rolls over or you reset the day, that day will appear here."
          }
        />
      ) : (
        visibleEntries.map((entry) => <HistoryEntryCard key={entry.dayKey} entry={entry} />)
      )}
    </ScrollView>
  );
}
