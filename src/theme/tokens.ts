import type { TextStyle } from "react-native";

import type { AccentKey, CalendarColorKey, FontStyleId } from "../model/types";

export type ThemeTokens = {
  scheme: "light" | "dark";
  // undefined = use the platform system font (SF on iOS, Roboto on Android).
  fontFamily?: string;
  fontFamilyBold?: string;
  bg: string;
  bgMuted: string;
  surface: string;
  surfaceStrong: string;
  card: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentStrong: string;
  onAccent: string;
  accentSubtle: string;
  danger: string;
  success: string;
  tabBar: string;
  overlay: string;
  inputBg: string;
};

// Dark = the web app's sage/forest look. Accents relabeled Sage/Forest/Olive
// in Settings, matching the web app's indigo/blue/violet keys.
const darkAccents: Record<AccentKey, { accent: string; accentStrong: string; onAccent: string; accentSubtle: string }> = {
  indigo: { accent: "#dce7d4", accentStrong: "#eef5e8", onAccent: "#0d1210", accentSubtle: "rgba(220,231,212,0.08)" },
  blue: { accent: "#cddbd0", accentStrong: "#e8f0eb", onAccent: "#0d1210", accentSubtle: "rgba(205,219,208,0.08)" },
  violet: { accent: "#e6e2cf", accentStrong: "#f5f1df", onAccent: "#0d1210", accentSubtle: "rgba(230,226,207,0.08)" },
};

const lightAccents: Record<AccentKey, { accent: string; accentStrong: string; onAccent: string; accentSubtle: string }> = {
  indigo: { accent: "#4a6741", accentStrong: "#3a5233", onAccent: "#f6faf2", accentSubtle: "rgba(74,103,65,0.10)" },
  blue: { accent: "#3e5c4b", accentStrong: "#30483a", onAccent: "#f2f8f4", accentSubtle: "rgba(62,92,75,0.10)" },
  violet: { accent: "#77713f", accentStrong: "#5e5931", onAccent: "#faf8ee", accentSubtle: "rgba(119,113,63,0.10)" },
};

export function getThemeTokens(scheme: "light" | "dark", accentKey: AccentKey): ThemeTokens {
  if (scheme === "dark") {
    const accent = darkAccents[accentKey];
    return {
      scheme,
      bg: "#0a0f0d",
      bgMuted: "#101614",
      surface: "#111614",
      surfaceStrong: "#161c19",
      card: "#141a17",
      border: "rgba(215,227,210,0.12)",
      borderStrong: "rgba(215,227,210,0.22)",
      text: "#f2f5ef",
      textSecondary: "#a8b2a3",
      textMuted: "#6f7a72",
      danger: "#ff8379",
      success: "#49d3ab",
      tabBar: "#0d1210",
      overlay: "rgba(0,0,0,0.6)",
      inputBg: "rgba(255,255,255,0.04)",
      ...accent,
    };
  }

  const accent = lightAccents[accentKey];
  return {
    scheme,
    bg: "#f4f6f1",
    bgMuted: "#eef1ea",
    surface: "#fbfcf9",
    surfaceStrong: "#ffffff",
    card: "#ffffff",
    border: "rgba(38,52,42,0.12)",
    borderStrong: "rgba(38,52,42,0.22)",
    text: "#1b231d",
    textSecondary: "#4d5a4f",
    textMuted: "#7d887e",
    danger: "#d24a41",
    success: "#1f9d76",
    tabBar: "#fbfcf9",
    overlay: "rgba(20,26,22,0.45)",
    inputBg: "rgba(38,52,42,0.05)",
    ...accent,
  };
}

export const ACCENT_LABELS: Record<AccentKey, string> = {
  indigo: "Sage",
  blue: "Forest",
  violet: "Olive",
};

// Maps each selectable font style onto its loaded regular/bold family names.
// `system` leaves both undefined so RN falls back to the platform system font.
const FONT_FAMILIES: Record<FontStyleId, { fontFamily?: string; fontFamilyBold?: string }> = {
  system: { fontFamily: undefined, fontFamilyBold: undefined },
  inter: { fontFamily: "Inter_400Regular", fontFamilyBold: "Inter_700Bold" },
  lora: { fontFamily: "Lora_400Regular", fontFamilyBold: "Lora_700Bold" },
  mono: { fontFamily: "SpaceMono_400Regular", fontFamilyBold: "SpaceMono_700Bold" },
};

export function getFontFamilies(fontStyle: FontStyleId): { fontFamily?: string; fontFamilyBold?: string } {
  return FONT_FAMILIES[fontStyle] ?? FONT_FAMILIES.system;
}

export const FONT_STYLE_LABELS: Record<FontStyleId, string> = {
  system: "System",
  inter: "Inter",
  lora: "Lora",
  mono: "Mono",
};

// RN gotcha: a custom `fontFamily` combined with a numeric `fontWeight` makes
// iOS/Android silently fall back to the system font for bold text, because our
// loaded families are single-weight files. So when a custom family is active we
// pick the regular or bold family file directly and DROP fontWeight. For the
// system font we pass the requested weight straight through.
export function resolveFontStyle(
  tokens: Pick<ThemeTokens, "fontFamily" | "fontFamilyBold">,
  weight?: TextStyle["fontWeight"],
): { fontFamily?: string; fontWeight?: TextStyle["fontWeight"] } {
  if (!tokens.fontFamily) {
    return weight !== undefined ? { fontWeight: weight } : {};
  }

  const numeric = typeof weight === "number" ? weight : typeof weight === "string" ? parseInt(weight, 10) : NaN;
  const isBold = weight === "bold" || (Number.isFinite(numeric) && numeric >= 600);
  return { fontFamily: isBold ? tokens.fontFamilyBold ?? tokens.fontFamily : tokens.fontFamily };
}

export type EventColorTokens = {
  label: string;
  base: string;
  onBase: string;
  soft: string;
  softText: string;
};

const darkEventColors: Record<CalendarColorKey, EventColorTokens> = {
  sage: { label: "Sage", base: "#dce7d4", onBase: "#0d1210", soft: "rgba(220,231,212,0.20)", softText: "#eef5e8" },
  mint: { label: "Mint", base: "#49d3ab", onBase: "#07110d", soft: "rgba(73,211,171,0.16)", softText: "#9ef0d6" },
  amber: { label: "Amber", base: "#f8a44f", onBase: "#161008", soft: "rgba(248,164,79,0.16)", softText: "#ffcb93" },
  rose: { label: "Rose", base: "#ff8379", onBase: "#160908", soft: "rgba(255,131,121,0.16)", softText: "#ffb2ac" },
  sky: { label: "Sky", base: "#7cc7ff", onBase: "#071018", soft: "rgba(124,199,255,0.16)", softText: "#b9e1ff" },
  violet: { label: "Violet", base: "#b985ff", onBase: "#10091c", soft: "rgba(185,133,255,0.16)", softText: "#d6bbff" },
};

const lightEventColors: Record<CalendarColorKey, EventColorTokens> = {
  sage: { label: "Sage", base: "#5d7a52", onBase: "#f6faf2", soft: "rgba(93,122,82,0.14)", softText: "#3c5234" },
  mint: { label: "Mint", base: "#1f9d76", onBase: "#f0fbf7", soft: "rgba(31,157,118,0.14)", softText: "#136349" },
  amber: { label: "Amber", base: "#d9822b", onBase: "#fdf6ee", soft: "rgba(217,130,43,0.16)", softText: "#8f5416" },
  rose: { label: "Rose", base: "#d24a41", onBase: "#fdf1f0", soft: "rgba(210,74,65,0.14)", softText: "#8f2f28" },
  sky: { label: "Sky", base: "#2e7fc2", onBase: "#f0f7fd", soft: "rgba(46,127,194,0.14)", softText: "#1d537f" },
  violet: { label: "Violet", base: "#7a4fc9", onBase: "#f6f1fd", soft: "rgba(122,79,201,0.14)", softText: "#4f3283" },
};

export function getEventColors(scheme: "light" | "dark"): Record<CalendarColorKey, EventColorTokens> {
  return scheme === "dark" ? darkEventColors : lightEventColors;
}

// Habit heatmap palette cycles through four hues (web parity).
export function getHabitPalette(scheme: "light" | "dark") {
  if (scheme === "dark") {
    return [
      { accent: "#49d3ab", tileOn: "#35c79f", badgeText: "#9ef0d6", badgeBg: "rgba(73,211,171,0.12)" },
      { accent: "#b985ff", tileOn: "#a971f6", badgeText: "#d6bbff", badgeBg: "rgba(185,133,255,0.12)" },
      { accent: "#ff8379", tileOn: "#f27067", badgeText: "#ffb2ac", badgeBg: "rgba(255,131,121,0.12)" },
      { accent: "#f8a44f", tileOn: "#f09a40", badgeText: "#ffcb93", badgeBg: "rgba(248,164,79,0.12)" },
    ] as const;
  }

  return [
    { accent: "#1f9d76", tileOn: "#1f9d76", badgeText: "#136349", badgeBg: "rgba(31,157,118,0.12)" },
    { accent: "#7a4fc9", tileOn: "#7a4fc9", badgeText: "#4f3283", badgeBg: "rgba(122,79,201,0.12)" },
    { accent: "#d24a41", tileOn: "#d24a41", badgeText: "#8f2f28", badgeBg: "rgba(210,74,65,0.12)" },
    { accent: "#d9822b", tileOn: "#d9822b", badgeText: "#8f5416", badgeBg: "rgba(217,130,43,0.12)" },
  ] as const;
}
