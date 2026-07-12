import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ExecutionRuntime } from "../src/runtime/ExecutionRuntime";
import { useExecutionStore } from "../src/store/executionStore";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";
import { LoadingScreen } from "../src/ui/primitives";
import { FloatingTimer } from "../src/components/FloatingTimer";

function RootStack() {
  const { tokens } = useTheme();
  const hydrated = useExecutionStore((store) => store.hydrated);

  return (
    <>
      <StatusBar style={tokens.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: tokens.bg },
          headerTintColor: tokens.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: tokens.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="board" options={{ title: "Board" }} />
        <Stack.Screen name="goals" options={{ title: "Goals" }} />
        <Stack.Screen name="life" options={{ title: "Life calendar" }} />
        <Stack.Screen name="journal" options={{ title: "Journal" }} />
        <Stack.Screen name="history" options={{ title: "History" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
      <FloatingTimer />
      {!hydrated ? <LoadingScreen /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ExecutionRuntime />
        <RootStack />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
