import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { useAppState } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { AppButton, AppTextInput, Card, EmptyState, MutedLabel, Row, SegmentedControl } from "../ui/primitives";

export function JournalScreen() {
  const { tokens } = useTheme();
  const state = useAppState();
  const setJournal = useExecutionStore((store) => store.setJournal);
  const setMonthlyJournal = useExecutionStore((store) => store.setMonthlyJournal);
  const addPrompt = useExecutionStore((store) => store.addPrompt);
  const removePrompt = useExecutionStore((store) => store.removePrompt);
  const setHardestTask = useExecutionStore((store) => store.setHardestTask);
  const setFirstStep = useExecutionStore((store) => store.setFirstStep);

  const [entryType, setEntryType] = useState<"daily" | "monthly">("daily");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState("");

  const prompts = state.prompts[entryType];

  useEffect(() => {
    if (!selectedPrompt || !prompts.includes(selectedPrompt)) {
      setSelectedPrompt(prompts[0] ?? null);
    }
  }, [prompts, selectedPrompt]);

  const journalValue = entryType === "daily" ? state.journal : state.monthlyJournal;
  const setJournalValue = entryType === "daily" ? setJournal : setMonthlyJournal;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 140, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <SegmentedControl
        options={[
          { value: "daily", label: "Daily entry" },
          { value: "monthly", label: "Monthly entry" },
        ]}
        value={entryType}
        onChange={setEntryType}
      />

      <Card style={{ gap: 12 }}>
        <MutedLabel>Prompts</MutedLabel>
        {prompts.length === 0 ? (
          <EmptyState message="Add a prompt to guide your reflection." />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {prompts.map((prompt) => {
              const active = prompt === selectedPrompt;
              return (
                <Pressable
                  key={prompt}
                  onPress={() => setSelectedPrompt(prompt)}
                  onLongPress={() => removePrompt(entryType, prompt)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? tokens.accent : tokens.border,
                    backgroundColor: active ? tokens.accentSubtle : "transparent",
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: active ? tokens.text : tokens.textSecondary, fontSize: 13 }}>{prompt}</Text>
                  {active ? (
                    <Pressable onPress={() => removePrompt(entryType, prompt)} hitSlop={8}>
                      <X size={12} color={tokens.textMuted} />
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
        <Row gap={8}>
          <AppTextInput
            placeholder={entryType === "daily" ? "Add daily prompt" : "Add monthly prompt"}
            value={newPrompt}
            onChangeText={setNewPrompt}
            onSubmitEditing={() => {
              addPrompt(entryType, newPrompt);
              setNewPrompt("");
            }}
            style={{ flex: 1 }}
          />
          <AppButton
            label="Add"
            small
            onPress={() => {
              addPrompt(entryType, newPrompt);
              setNewPrompt("");
            }}
          />
        </Row>
      </Card>

      <Card style={{ gap: 12 }}>
        {selectedPrompt ? (
          <View
            style={{
              borderRadius: 14,
              backgroundColor: tokens.accentSubtle,
              borderWidth: 1,
              borderColor: tokens.border,
              padding: 12,
            }}
          >
            <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "600" }}>{selectedPrompt}</Text>
          </View>
        ) : null}
        <AppTextInput
          placeholder="Write it down. Short and honest beats long and vague."
          value={journalValue}
          onChangeText={setJournalValue}
          multiline
          style={{ minHeight: 220 }}
        />
      </Card>

      {entryType === "daily" ? (
        <Card style={{ gap: 12 }}>
          <MutedLabel>Day setup</MutedLabel>
          <View style={{ gap: 6 }}>
            <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "600" }}>Hardest task today</Text>
            <AppTextInput placeholder="The one thing you're most likely to avoid" value={state.hardestTask} onChangeText={setHardestTask} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "600" }}>First step</Text>
            <AppTextInput placeholder="The 2-minute move that starts it" value={state.firstStep} onChangeText={setFirstStep} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}
