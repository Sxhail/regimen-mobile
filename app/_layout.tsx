import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold } from "@expo-google-fonts/lora";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";

import { ExecutionRuntime } from "../src/runtime/ExecutionRuntime";
import { useExecutionStore } from "../src/store/executionStore";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";
import { LoadingScreen } from "../src/ui/primitives";
import { FloatingTimer } from "../src/components/FloatingTimer";

// Hold the native splash until fonts + persisted state are ready AND at least
// MIN_SPLASH_MS have passed since launch.
SplashScreen.preventAutoHideAsync().catch(() => {});
const MIN_SPLASH_MS = 3000;
const launchedAt = Date.now();

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

  const ready = hydrated && fontsLoaded;

  useEffect(() => {
    if (!ready) {
      return;
    }
    const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - launchedAt));
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, remaining);
    return () => clearTimeout(timeout);
  }, [ready]);

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
