import React, { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { AppText as Text } from "../ui/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Crosshair, MoreHorizontal, Pencil, Play, Plus, StickyNote, Trash2 } from "lucide-react-native";

import { formatSeconds } from "../model/time";
import type { Task } from "../model/types";
import { useAppState, useLiveTasks } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, AppTextInput, Card, CheckCircle, EmptyState, IconButton, MutedLabel, Row, Sheet } from "../ui/primitives";
import { ScreenHeader } from "../components/ScreenHeader";

function TaskRow({ task }: { task: Task }) {
  const { tokens } = useTheme();
  const state = useAppState();
  const completeTask = useExecutionStore((store) => store.completeTask);
  const deleteTask = useExecutionStore((store) => store.deleteTask);
  const startTask = useExecutionStore((store) => store.startTask);
  const saveTaskEdit = useExecutionStore((store) => store.saveTaskEdit);
  const updateTaskNotes = useExecutionStore((store) => store.updateTaskNotes);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [notesOpen, setNotesOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const isActive = state.activeTaskId === task.id;

  const commitEdit = () => {
    saveTaskEdit(task.id, editTitle);
    setEditing(false);
  };

  return (
    <View
      style={{
        gap: 8,
        borderRadius: 14,
        borderLeftWidth: isActive ? 3 : 0,
        borderLeftColor: tokens.accent,
        backgroundColor: isActive ? tokens.accentSubtle : "transparent",
        paddingVertical: 8,
        paddingHorizontal: isActive ? 10 : 0,
      }}
    >
      <Row gap={10}>
        <CheckCircle checked={task.completed} onPress={() => completeTask(task.id)} />
        <View style={{ flex: 1, gap: 2 }}>
          {editing ? (
            <AppTextInput
              value={editTitle}
              onChangeText={setEditTitle}
              onSubmitEditing={commitEdit}
              onBlur={commitEdit}
              autoFocus
            />
          ) : (
            <Pressable onLongPress={() => setEditing(true)}>
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
            </Pressable>
          )}
          <Text style={{ color: tokens.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] }}>
            {formatSeconds(task.secondsSpent)}
          </Text>
        </View>
        <IconButton onPress={() => startTask(task.id)} disabled={task.completed} accessibilityLabel="Start focus">
          <Play size={14} color={task.completed ? tokens.textMuted : tokens.accent} />
        </IconButton>
        <IconButton
          onPress={() => setActionsOpen((open) => !open)}
          accessibilityLabel="More actions"
          style={actionsOpen ? { backgroundColor: tokens.accentSubtle, borderColor: tokens.accent } : undefined}
        >
          <MoreHorizontal size={14} color={actionsOpen ? tokens.accent : tokens.textMuted} />
        </IconButton>
      </Row>
      {actionsOpen ? (
        <Row gap={8} style={{ paddingLeft: 36, flexWrap: "wrap" }}>
          <AppButton
            label={notesOpen ? "Hide notes" : "Notes"}
            small
            variant="outline"
            icon={<StickyNote size={13} color={task.notes ? tokens.accent : tokens.text} />}
            onPress={() => setNotesOpen((open) => !open)}
          />
          <AppButton
            label="Edit"
            small
            variant="outline"
            icon={<Pencil size={13} color={tokens.text} />}
            onPress={() => setEditing(true)}
          />
          <AppButton
            label="Delete"
            small
            variant="danger"
            icon={<Trash2 size={13} color={tokens.danger} />}
            onPress={() => deleteTask(task.id)}
          />
        </Row>
      ) : null}
      {notesOpen ? (
        <AppTextInput
          placeholder="Working notes for this task"
          value={task.notes}
          onChangeText={(value) => updateTaskNotes(task.id, value)}
          multiline
        />
      ) : null}
    </View>
  );
}

export function TasksScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const state = useAppState();
  const tasks = useLiveTasks();
  const addTask = useExecutionStore((store) => store.addTask);
  const addTaskGroup = useExecutionStore((store) => store.addTaskGroup);
  const saveTaskGroupEdit = useExecutionStore((store) => store.saveTaskGroupEdit);
  const deleteTaskGroup = useExecutionStore((store) => store.deleteTaskGroup);

  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, string>>({});
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState("");

  const visibleGroups = focusedGroupId
    ? state.taskGroups.filter((group) => group.id === focusedGroupId)
    : state.taskGroups;

  const confirmDeleteGroup = (groupId: string, title: string) => {
    Alert.alert("Delete section", `Delete "${title}" and all its tasks?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTaskGroup(groupId);
          if (focusedGroupId === groupId) {
            setFocusedGroupId(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingTop: insets.top + 10, paddingBottom: 160, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Tasks" />

        {focusedGroupId ? (
          <Card style={{ backgroundColor: tokens.accentSubtle }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={{ color: tokens.text, fontSize: 13 }}>
                Focus mode is active for {state.taskGroups.find((group) => group.id === focusedGroupId)?.title ?? "section"}.
              </Text>
              <AppButton label="Exit focus" small variant="outline" onPress={() => setFocusedGroupId(null)} />
            </Row>
          </Card>
        ) : null}

        {state.taskGroups.length === 0 ? (
          <EmptyState message="No task sections yet. Create one to start organizing work by function." />
        ) : (
          visibleGroups.map((group) => {
            const groupTasks = tasks.filter((task) => task.groupId === group.id);
            return (
              <Card key={group.id} style={{ gap: 12 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  {editingGroupId === group.id ? (
                    <AppTextInput
                      value={editingGroupTitle}
                      onChangeText={setEditingGroupTitle}
                      onSubmitEditing={() => {
                        saveTaskGroupEdit(group.id, editingGroupTitle);
                        setEditingGroupId(null);
                      }}
                      onBlur={() => {
                        saveTaskGroupEdit(group.id, editingGroupTitle);
                        setEditingGroupId(null);
                      }}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <Text style={{ color: tokens.text, fontSize: 18, fontWeight: "700", flex: 1 }}>{group.title}</Text>
                  )}
                  <Row gap={6}>
                    <IconButton
                      onPress={() => setFocusedGroupId(focusedGroupId === group.id ? null : group.id)}
                      accessibilityLabel="Focus section"
                    >
                      <Crosshair size={14} color={focusedGroupId === group.id ? tokens.accent : tokens.textMuted} />
                    </IconButton>
                    <IconButton
                      onPress={() => {
                        setEditingGroupId(group.id);
                        setEditingGroupTitle(group.title);
                      }}
                      accessibilityLabel="Rename section"
                    >
                      <Pencil size={14} color={tokens.textMuted} />
                    </IconButton>
                    <IconButton onPress={() => confirmDeleteGroup(group.id, group.title)} accessibilityLabel="Delete section">
                      <Trash2 size={14} color={tokens.danger} />
                    </IconButton>
                  </Row>
                </Row>

                {groupTasks.length === 0 ? (
                  <EmptyState message="No tasks in this section yet." />
                ) : (
                  groupTasks.map((task) => <TaskRow key={task.id} task={task} />)
                )}

                <Row gap={8}>
                  <AppTextInput
                    placeholder="Add a task"
                    value={groupDrafts[group.id] ?? ""}
                    onChangeText={(value) => setGroupDrafts((drafts) => ({ ...drafts, [group.id]: value }))}
                    onSubmitEditing={() => {
                      addTask(group.id, groupDrafts[group.id] ?? "");
                      setGroupDrafts((drafts) => ({ ...drafts, [group.id]: "" }));
                    }}
                    style={{ flex: 1 }}
                    returnKeyType="done"
                  />
                  <AppButton
                    label="Add"
                    small
                    onPress={() => {
                      addTask(group.id, groupDrafts[group.id] ?? "");
                      setGroupDrafts((drafts) => ({ ...drafts, [group.id]: "" }));
                    }}
                  />
                </Row>
              </Card>
            );
          })
        )}

        <AppButton
          label="Add section"
          variant="outline"
          icon={<Plus size={16} color={tokens.text} />}
          onPress={() => setAddSectionOpen(true)}
          style={{ alignSelf: "flex-start" }}
        />
      </ScrollView>

      <Sheet visible={addSectionOpen} onClose={() => setAddSectionOpen(false)} title="New section">
        <MutedLabel>Section name</MutedLabel>
        <AppTextInput
          placeholder="e.g. Deep work"
          value={newSectionTitle}
          onChangeText={setNewSectionTitle}
          autoFocus
          onSubmitEditing={() => {
            addTaskGroup(newSectionTitle);
            setNewSectionTitle("");
            setAddSectionOpen(false);
          }}
        />
        <AppButton
          label="Create section"
          onPress={() => {
            addTaskGroup(newSectionTitle);
            setNewSectionTitle("");
            setAddSectionOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
}
