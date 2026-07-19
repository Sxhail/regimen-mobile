import React, { useState } from "react";
import { ScrollView, View } from "react-native";

import { AppText as Text } from "../ui/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, MoreHorizontal, Play, StickyNote } from "lucide-react-native";

import { formatSeconds } from "../model/time";
import type { Task, TaskKanbanStatus } from "../model/types";
import { useAppState, useLiveTasks } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, AppTextInput, Card, EmptyState, IconButton, MutedLabel, Row, SegmentedControl } from "../ui/primitives";

const COLUMNS: Array<{ key: TaskKanbanStatus; title: string; empty: string }> = [
  { key: "backlog", title: "Backlog", empty: "No tasks in backlog." },
  { key: "in_progress", title: "In progress", empty: "No tasks in progress." },
  { key: "done", title: "Done", empty: "No completed tasks." },
];

function BoardCard({ task }: { task: Task }) {
  const { tokens } = useTheme();
  const state = useAppState();
  const updateTaskKanbanStatus = useExecutionStore((store) => store.updateTaskKanbanStatus);
  const updateTaskNotes = useExecutionStore((store) => store.updateTaskNotes);
  const startTask = useExecutionStore((store) => store.startTask);
  const [notesOpen, setNotesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const groupTitle = state.taskGroups.find((group) => group.id === task.groupId)?.title ?? "Unknown";
  const status = task.completed ? "done" : task.kanbanStatus;

  // Primary forward move stays visible; the remaining original transition sits
  // in the overflow row (dir controls the chevron direction).
  const forward =
    status === "backlog"
      ? { label: "Start", to: "in_progress" as TaskKanbanStatus }
      : status === "in_progress"
        ? { label: "Done", to: "done" as TaskKanbanStatus }
        : null;
  const secondary =
    status === "backlog"
      ? { label: "Done", to: "done" as TaskKanbanStatus, dir: "right" as const }
      : status === "in_progress"
        ? { label: "Backlog", to: "backlog" as TaskKanbanStatus, dir: "left" as const }
        : { label: "In progress", to: "in_progress" as TaskKanbanStatus, dir: "left" as const };

  return (
    <Card style={{ gap: 10, padding: 14 }}>
      <Text
        style={{
          color: task.completed ? tokens.textMuted : tokens.text,
          fontSize: 15,
          fontWeight: "600",
          textDecorationLine: task.completed ? "line-through" : "none",
        }}
      >
        {task.title}
      </Text>
      <Row style={{ justifyContent: "space-between" }}>
        <MutedLabel style={{ letterSpacing: 1.2 }}>{groupTitle}</MutedLabel>
        <Text style={{ color: tokens.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] }}>
          {formatSeconds(task.secondsSpent)}
        </Text>
      </Row>
      <Row style={{ justifyContent: "space-between" }}>
        {forward ? (
          <AppButton
            label={forward.label}
            small
            variant="outline"
            icon={<ChevronRight size={13} color={tokens.text} />}
            onPress={() => updateTaskKanbanStatus(task.id, forward.to)}
          />
        ) : (
          <View />
        )}
        <IconButton
          onPress={() => setMoreOpen((open) => !open)}
          accessibilityLabel="More actions"
          style={moreOpen ? { backgroundColor: tokens.accentSubtle, borderColor: tokens.accent } : undefined}
        >
          <MoreHorizontal size={13} color={moreOpen ? tokens.accent : tokens.textMuted} />
        </IconButton>
      </Row>
      {moreOpen ? (
        <Row gap={6} style={{ flexWrap: "wrap" }}>
          <AppButton
            label={secondary.label}
            small
            variant="outline"
            icon={
              secondary.dir === "left" ? (
                <ChevronLeft size={13} color={tokens.text} />
              ) : (
                <ChevronRight size={13} color={tokens.text} />
              )
            }
            onPress={() => updateTaskKanbanStatus(task.id, secondary.to)}
          />
          <AppButton
            label={notesOpen ? "Hide notes" : "Notes"}
            small
            variant="outline"
            icon={<StickyNote size={13} color={task.notes ? tokens.accent : tokens.text} />}
            onPress={() => setNotesOpen((open) => !open)}
          />
          {!task.completed ? (
            <AppButton
              label="Focus"
              small
              icon={<Play size={13} color={tokens.onAccent} />}
              onPress={() => startTask(task.id)}
            />
          ) : null}
        </Row>
      ) : null}
      {notesOpen ? (
        <AppTextInput
          placeholder="Notes"
          value={task.notes}
          onChangeText={(value) => updateTaskNotes(task.id, value)}
          multiline
        />
      ) : null}
    </Card>
  );
}

export function BoardScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const tasks = useLiveTasks();
  const [selected, setSelected] = useState<TaskKanbanStatus>("backlog");

  const tasksFor = (column: TaskKanbanStatus) =>
    column === "done"
      ? tasks.filter((task) => task.completed)
      : tasks.filter((task) => !task.completed && task.kanbanStatus === column);

  const activeColumn = COLUMNS.find((column) => column.key === selected) ?? COLUMNS[0];
  const columnTasks = tasksFor(activeColumn.key);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: 12, gap: 14 }}>
        <SegmentedControl<TaskKanbanStatus>
          value={selected}
          onChange={setSelected}
          options={COLUMNS.map((column) => ({ value: column.key, label: column.title }))}
        />
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={{ color: tokens.text, fontSize: 17, fontWeight: "700" }}>{activeColumn.title}</Text>
          <View
            style={{
              minWidth: 26,
              height: 26,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: tokens.border,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 8,
            }}
          >
            <Text style={{ color: tokens.textSecondary, fontSize: 12, fontWeight: "700" }}>{columnTasks.length}</Text>
          </View>
        </Row>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 120, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {columnTasks.length === 0 ? (
          <EmptyState message={activeColumn.empty} />
        ) : (
          columnTasks.map((task) => <BoardCard key={task.id} task={task} />)
        )}
      </ScrollView>
    </View>
  );
}
