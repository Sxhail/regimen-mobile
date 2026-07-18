import React from "react";
import { ScrollView, View } from "react-native";

import { AppText as Text } from "../ui/AppText";
import { Trash2 } from "lucide-react-native";

import type { GoalBucketKey } from "../model/types";
import { useAppState } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, AppTextInput, Card, EmptyState, IconButton, Row } from "../ui/primitives";

const BUCKETS: Array<{ bucket: GoalBucketKey; title: string; addLabel: string }> = [
  { bucket: "vision", title: "Yearly", addLabel: "Add yearly goal" },
  { bucket: "month", title: "This Month", addLabel: "Add this month goal" },
  { bucket: "today", title: "This Week", addLabel: "Add this week goal" },
];

export function GoalsScreen() {
  const { tokens } = useTheme();
  const state = useAppState();
  const updateGoalDraft = useExecutionStore((store) => store.updateGoalDraft);
  const addGoal = useExecutionStore((store) => store.addGoal);
  const removeGoal = useExecutionStore((store) => store.removeGoal);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 140, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      {BUCKETS.map(({ bucket, title, addLabel }) => (
        <Card key={bucket} style={{ gap: 12 }}>
          <Text style={{ color: tokens.text, fontSize: 19, fontWeight: "700" }}>{title}</Text>

          {state.goals[bucket].length === 0 ? (
            <EmptyState message="No goals set yet." />
          ) : (
            state.goals[bucket].map((goal) => (
              <Row key={goal.id} style={{ alignItems: "flex-start" }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>{goal.title}</Text>
                  {goal.note ? <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>{goal.note}</Text> : null}
                </View>
                <IconButton onPress={() => removeGoal(bucket, goal.id)} accessibilityLabel="Delete goal">
                  <Trash2 size={15} color={tokens.danger} />
                </IconButton>
              </Row>
            ))
          )}

          <View style={{ gap: 8 }}>
            <AppTextInput
              placeholder={addLabel}
              value={state.goalDrafts[bucket].title}
              onChangeText={(value) => updateGoalDraft(bucket, "title", value)}
            />
            <AppTextInput
              placeholder="Add note or constraint"
              value={state.goalDrafts[bucket].note}
              onChangeText={(value) => updateGoalDraft(bucket, "note", value)}
              multiline
            />
            <AppButton label="+ Add goal" onPress={() => addGoal(bucket)} variant="outline" />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
