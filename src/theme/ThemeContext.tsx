import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

import { useExecutionStore } from "../store/executionStore";
import { getEventColors, getHabitPalette, getThemeTokens, type ThemeTokens } from "./tokens";
import type { CalendarColorKey } from "../model/types";
import type { EventColorTokens } from "./tokens";

type ThemeContextValue = {
  tokens: ThemeTokens;
  eventColors: Record<CalendarColorKey, EventColorTokens>;
  habitPalette: ReturnType<typeof getHabitPalette>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themeMode = useExecutionStore((store) => store.state.themeMode);
  const accent = useExecutionStore((store) => store.state.accent);

  const scheme: "light" | "dark" = themeMode === "system" ? (systemScheme === "light" ? "light" : "dark") : themeMode;

  const value = useMemo(
    () => ({
      tokens: getThemeTokens(scheme, accent),
      eventColors: getEventColors(scheme),
      habitPalette: getHabitPalette(scheme),
    }),
    [scheme, accent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
