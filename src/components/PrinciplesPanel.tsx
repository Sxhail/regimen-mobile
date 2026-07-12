import React from "react";
import { Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";

import { useAppState } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, AppTextInput, Card, EmptyState, IconButton, MutedLabel, Row } from "../ui/primitives";

export function PrinciplesPanel() {
  const { tokens } = useTheme();
  const state = useAppState();
  const updatePrincipleDraft = useExecutionStore((store) => store.updatePrincipleDraft);
  const addPrinciple = useExecutionStore((store) => store.addPrinciple);
  const removePrinciple = useExecutionStore((store) => store.removePrinciple);

  return (
    <Card style={{ gap: 12 }}>
      <MutedLabel>Principles</MutedLabel>
      {state.principles.length === 0 ? (
        <EmptyState message="No principles yet. Write down the rules you refuse to break." />
      ) : (
        state.principles.map((principle) => (
          <Row key={principle.id} style={{ alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>{principle.title}</Text>
              {principle.note ? <Text style={{ color: tokens.textSecondary, fontSize: 13 }}>{principle.note}</Text> : null}
            </View>
            <IconButton onPress={() => removePrinciple(principle.id)} accessibilityLabel="Delete principle">
              <Trash2 size={15} color={tokens.danger} />
            </IconButton>
          </Row>
        ))
      )}
      <View style={{ gap: 8 }}>
        <AppTextInput
          placeholder="Principle title"
          value={state.principleDraft.title}
          onChangeText={(value) => updatePrincipleDraft("title", value)}
        />
        <AppTextInput
          placeholder="Add note or constraint"
          value={state.principleDraft.note}
          onChangeText={(value) => updatePrincipleDraft("note", value)}
        />
        <AppButton label="Add principle" onPress={addPrinciple} variant="outline" small />
      </View>
    </Card>
  );
}
