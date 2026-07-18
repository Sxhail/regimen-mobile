import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold } from "@expo-google-fonts/lora";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";

import { ExecutionRuntime } from "../src/runtime/ExecutionRuntime";
import { useExecutionStore } from "../src/store/executionStore";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";
import { LoadingScreen } from "../src/ui/primitives";
import { FloatingTimer } from "../src/components/FloatingTimer";

function RootStack() {
  const { tokens } = useTheme();
  const hydrated = useExecutionStore((store) => store.hydrated);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  return (
    <>
      <StatusBar style={tokens.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: tokens.bg },
          headerTintColor: tokens.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
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
      {!hydrated || !fontsLoaded ? <LoadingScreen /> : null}
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
