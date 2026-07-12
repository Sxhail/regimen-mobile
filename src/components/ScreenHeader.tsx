import React from "react";
import { Alert, View } from "react-native";
import { Clock3, TimerReset } from "lucide-react-native";

import { useCurrentMonthLabel, useTodayDateLabel } from "../store/derived";
import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { IconButton, MutedLabel, Row, Subtitle, Title } from "../ui/primitives";

// Global header (web top bar parity): month, date, Reset day, Timer toggle.
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { tokens } = useTheme();
  const currentMonthLabel = useCurrentMonthLabel();
  const todayDateLabel = useTodayDateLabel();
  const resetToday = useExecutionStore((store) => store.resetToday);
  const showFloatingTimer = useExecutionStore((store) => store.state.showFloatingTimer);
  const setShowFloatingTimer = useExecutionStore((store) => store.setShowFloatingTimer);

  const confirmReset = () => {
    Alert.alert("Reset day", "Archive today into History and reset habits, journal, and focus time?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset day", style: "destructive", onPress: resetToday },
    ]);
  };

  return (
    <View style={{ gap: 12, paddingBottom: 14 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ gap: 2 }}>
          <MutedLabel>{currentMonthLabel}</MutedLabel>
          <Subtitle style={{ fontWeight: "600", color: tokens.textSecondary }}>{todayDateLabel}</Subtitle>
        </View>
        <Row gap={8}>
          <IconButton onPress={confirmReset} accessibilityLabel="Reset day">
            <TimerReset size={17} color={tokens.textSecondary} />
          </IconButton>
          <IconButton onPress={() => setShowFloatingTimer(!showFloatingTimer)} accessibilityLabel="Toggle timer">
            <Clock3 size={17} color={showFloatingTimer ? tokens.accent : tokens.textSecondary} />
          </IconButton>
        </Row>
      </Row>
      <View style={{ gap: 4 }}>
        <Title>{title}</Title>
        {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
      </View>
    </View>
  );
}
