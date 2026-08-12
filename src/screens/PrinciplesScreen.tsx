import React from "react";
import { ScrollView, View } from "react-native";
import { Trash2 } from "lucide-react-native";

import { AppText as Text } from "../ui/AppText";
import { useAppState } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, AppTextInput, Card, EmptyState, IconButton, Row } from "../ui/primitives";

export function PrinciplesScreen() {
  const { tokens } = useTheme();
  const state = useAppState();
  const updatePrincipleDraft = useExecutionStore((store) => store.updatePrincipleDraft);
  const addPrinciple = useExecutionStore((store) => store.addPrinciple);
  const removePrinciple = useExecutionStore((store) => store.removePrinciple);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 140, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ gap: 12 }}>
        <Text style={{ color: tokens.text, fontSize: 19, fontWeight: "700" }}>Operating principles</Text>
        {state.principles.length === 0 ? (
          <EmptyState message="No principles yet. Add the rules you want in front of you every day." />
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
            placeholder="Add a principle heading"
            value={state.principleDraft.title}
            onChangeText={(value) => updatePrincipleDraft("title", value)}
          />
          <AppTextInput
            placeholder="Add context or a reminder"
            value={state.principleDraft.note}
            onChangeText={(value) => updatePrincipleDraft("note", value)}
            multiline
          />
          <AppButton label="+ Add principle" onPress={addPrinciple} variant="outline" />
        </View>
      </Card>
    </ScrollView>
  );
}
