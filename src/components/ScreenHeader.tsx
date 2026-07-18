import React from "react";
import { Alert, View } from "react-native";
import { Clock3, TimerReset } from "lucide-react-native";

import { useExecutionStore } from "../store/executionStore";
import { useTheme } from "../theme/ThemeContext";
import { IconButton, Row, Title } from "../ui/primitives";

// Global header (web top bar parity): title, Reset day, Timer toggle.
export function ScreenHeader({ title }: { title: string }) {
  const { tokens } = useTheme();
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
    <View style={{ paddingBottom: 14 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Title>{title}</Title>
        <Row gap={8}>
          <IconButton onPress={confirmReset} accessibilityLabel="Reset day">
            <TimerReset size={17} color={tokens.textSecondary} />
          </IconButton>
          <IconButton onPress={() => setShowFloatingTimer(!showFloatingTimer)} accessibilityLabel="Toggle timer">
            <Clock3 size={17} color={showFloatingTimer ? tokens.accent : tokens.textSecondary} />
          </IconButton>
        </Row>
      </Row>
    </View>
  );
}
