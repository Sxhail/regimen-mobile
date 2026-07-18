import React from "react";
import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { resolveFontStyle } from "../theme/tokens";
import { useTheme } from "../theme/ThemeContext";

// Drop-in replacement for react-native's `Text` that applies the app-wide font
// style. When the selected font is "System" (tokens.fontFamily undefined) the
// incoming style passes through untouched. Otherwise we read the requested
// fontWeight, strip it, and swap in the matching regular/bold custom family —
// numeric fontWeight + custom single-weight family would otherwise fall back to
// the system font on iOS/Android (see resolveFontStyle).
export function AppText({ style, ...props }: TextProps) {
  const { tokens } = useTheme();

  if (!tokens.fontFamily) {
    return <Text {...props} style={style} />;
  }

  const flattened = (StyleSheet.flatten(style) ?? {}) as TextStyle;

  // Respect an explicitly-set fontFamily (e.g. intentional monospace code blocks).
  if (flattened.fontFamily) {
    return <Text {...props} style={style} />;
  }

  const { fontWeight, ...rest } = flattened;
  const resolved = resolveFontStyle(tokens, fontWeight);

  return <Text {...props} style={[rest, resolved]} />;
}
