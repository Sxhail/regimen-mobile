import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppText as Text } from "../ui/AppText";
import { Trash2 } from "lucide-react-native";

import type { AccentKey, FontStyleId, MetricType, ThemeMode } from "../model/types";
import { useAppState } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { ACCENT_LABELS } from "../theme/tokens";
import { AppButton, AppTextInput, Card, IconButton, MutedLabel, Row, SegmentedControl, SwitchRow } from "../ui/primitives";

const ACCENTS: AccentKey[] = ["indigo", "blue", "violet"];

export function SettingsScreen() {
  const { tokens } = useTheme();
  const state = useAppState();
  const setThemeMode = useExecutionStore((store) => store.setThemeMode);
  const setFontStyle = useExecutionStore((store) => store.setFontStyle);
  const setAccent = useExecutionStore((store) => store.setAccent);
  const setCompactMode = useExecutionStore((store) => store.setCompactMode);
  const setShowFloatingTimer = useExecutionStore((store) => store.setShowFloatingTimer);
  const addMetric = useExecutionStore((store) => store.addMetric);
  const removeMetric = useExecutionStore((store) => store.removeMetric);
  const updateMetric = useExecutionStore((store) => store.updateMetric);

  const [metricLabel, setMetricLabel] = useState("");
  const [metricType, setMetricType] = useState<MetricType>("time");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 140, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={{ gap: 14 }}>
        <MutedLabel>Appearance</MutedLabel>

        <View style={{ gap: 8 }}>
          <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>Theme</Text>
          <SegmentedControl<ThemeMode>
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            value={state.themeMode}
            onChange={setThemeMode}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>Font Style</Text>
          <SegmentedControl<FontStyleId>
            options={[
              { value: "system", label: "System" },
              { value: "inter", label: "Inter" },
              { value: "lora", label: "Lora" },
              { value: "mono", label: "Mono" },
            ]}
            value={state.fontStyle}
            onChange={setFontStyle}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>Accent</Text>
          <Row gap={10}>
            {ACCENTS.map((accentKey) => {
              const active = state.accent === accentKey;
              return (
                <Pressable
                  key={accentKey}
                  onPress={() => setAccent(accentKey)}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: active ? tokens.accent : tokens.border,
                    backgroundColor: active ? tokens.accentSubtle : "transparent",
                    paddingVertical: 12,
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <View style={{ width: 18, height: 18, borderRadius: 999, backgroundColor: tokens.accent, opacity: active ? 1 : 0.4 }} />
                  <Text style={{ color: active ? tokens.text : tokens.textSecondary, fontSize: 13, fontWeight: "600" }}>
                    {ACCENT_LABELS[accentKey]}
                  </Text>
                </Pressable>
              );
            })}
          </Row>
        </View>

        <SwitchRow
          label="Compact day layout"
          description="Tighter spacing on the Today screen."
          value={state.compactMode}
          onValueChange={setCompactMode}
        />
      </Card>

      <Card style={{ gap: 14 }}>
        <MutedLabel>Focus settings</MutedLabel>
        <SwitchRow
          label="Show floating timer"
          description="Keep the timer visible while you work."
          value={state.showFloatingTimer}
          onValueChange={setShowFloatingTimer}
        />
        <Text style={{ color: tokens.textMuted, fontSize: 13 }}>
          {state.timerMode === "pomodoro"
            ? `Pomodoro mode: ${state.pomodoroConfig.workMinutes}m focus / ${state.pomodoroConfig.breakMinutes}m break × ${state.pomodoroConfig.rounds} rounds. Adjust in the timer panel.`
            : "Free mode: the timer counts up while you work. Switch modes in the timer panel."}
        </Text>
      </Card>

      <Card style={{ gap: 14 }}>
        <MutedLabel>Custom inputs</MutedLabel>
        {state.metrics.map((metric) => (
          <Row key={metric.id} gap={8}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "600" }}>
                {metric.label} <Text style={{ color: tokens.textMuted, fontSize: 12 }}>({metric.type})</Text>
              </Text>
              <AppTextInput
                placeholder="Target (optional)"
                value={metric.target}
                onChangeText={(value) => updateMetric(metric.id, "target", value)}
              />
            </View>
            <IconButton onPress={() => removeMetric(metric.id)} accessibilityLabel="Remove input">
              <Trash2 size={14} color={tokens.danger} />
            </IconButton>
          </Row>
        ))}
        <View style={{ gap: 8 }}>
          <AppTextInput placeholder="New input label (e.g. Reading)" value={metricLabel} onChangeText={setMetricLabel} />
          <SegmentedControl<MetricType>
            options={[
              { value: "time", label: "Time" },
              { value: "number", label: "Number" },
              { value: "text", label: "Text" },
            ]}
            value={metricType}
            onChange={setMetricType}
          />
          <AppButton
            label="Add custom input"
            variant="outline"
            onPress={() => {
              addMetric(metricLabel, metricType);
              setMetricLabel("");
              setMetricType("time");
            }}
          />
        </View>
      </Card>
    </ScrollView>
  );
}
