import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Play, StickyNote } from "lucide-react-native";

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

  const groupTitle = state.taskGroups.find((group) => group.id === task.groupId)?.title ?? "Unknown";
  const status = task.completed ? "done" : task.kanbanStatus;

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
      <Row gap={6} style={{ flexWrap: "wrap" }}>
        {status === "in_progress" ? (
          <AppButton
            label="Backlog"
            small
            variant="outline"
            icon={<ChevronLeft size={13} color={tokens.text} />}
            onPress={() => updateTaskKanbanStatus(task.id, "backlog")}
          />
        ) : null}
        {status === "done" ? (
          <AppButton
            label="In progress"
            small
            variant="outline"
            icon={<ChevronLeft size={13} color={tokens.text} />}
            onPress={() => updateTaskKanbanStatus(task.id, "in_progress")}
          />
        ) : null}
        {status === "backlog" ? (
          <AppButton
            label="Start"
            small
            variant="outline"
            icon={<ChevronRight size={13} color={tokens.text} />}
            onPress={() => updateTaskKanbanStatus(task.id, "in_progress")}
          />
        ) : null}
        {status !== "done" ? (
          <AppButton
            label="Done"
            small
            variant="outline"
            icon={<ChevronRight size={13} color={tokens.text} />}
            onPress={() => updateTaskKanbanStatus(task.id, "done")}
          />
        ) : null}
        <IconButton onPress={() => setNotesOpen((open) => !open)} accessibilityLabel="Toggle notes">
          <StickyNote size={13} color={task.notes ? tokens.accent : tokens.textMuted} />
        </IconButton>
        {!task.completed ? (
          <IconButton onPress={() => startTask(task.id)} accessibilityLabel="Start focus">
            <Play size={13} color={tokens.accent} />
          </IconButton>
        ) : null}
      </Row>
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
