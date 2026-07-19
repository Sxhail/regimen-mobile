import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Check, X } from "lucide-react-native";

import { useTheme } from "../theme/ThemeContext";
import { AppText as Text } from "./AppText";

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tokens.card,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: 24,
          padding: 18,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function MutedLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { tokens } = useTheme();
  return (
    <Text
      style={[
        {
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 2.4,
          color: tokens.textMuted,
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { tokens } = useTheme();
  return <Text style={[{ fontSize: 30, fontWeight: "700", color: tokens.text }, style]}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { tokens } = useTheme();
  return <Text style={[{ fontSize: 14, color: tokens.textSecondary, lineHeight: 20 }, style]}>{children}</Text>;
}

export function BodyText({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { tokens } = useTheme();
  return <Text style={[{ fontSize: 15, color: tokens.text }, style]}>{children}</Text>;
}

export function StatTile({ label, value, hint, style }: { label: string; value: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: tokens.accentSubtle,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: 18,
          padding: 14,
          gap: 6,
        },
        style,
      ]}
    >
      <MutedLabel>{label}</MutedLabel>
      <Text style={{ fontSize: 24, fontWeight: "700", color: tokens.text, fontVariant: ["tabular-nums"] }}>{value}</Text>
      {hint ? <Text style={{ fontSize: 12, color: tokens.textMuted }}>{hint}</Text> : null}
    </View>
  );
}

type ButtonVariant = "primary" | "ghost" | "outline" | "danger";

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  small,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  small?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { tokens } = useTheme();

  const backgrounds: Record<ButtonVariant, string> = {
    primary: tokens.accent,
    ghost: "transparent",
    outline: "transparent",
    danger: "transparent",
  };
  const colors: Record<ButtonVariant, string> = {
    primary: tokens.onAccent,
    ghost: tokens.textSecondary,
    outline: tokens.text,
    danger: tokens.danger,
  };
  const borders: Record<ButtonVariant, string> = {
    primary: tokens.accent,
    ghost: "transparent",
    outline: tokens.borderStrong,
    danger: tokens.danger,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: borders[variant],
          backgroundColor: backgrounds[variant],
          paddingVertical: small ? 7 : 11,
          paddingHorizontal: small ? 12 : 18,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text style={{ color: colors[variant], fontWeight: "600", fontSize: small ? 13 : 15 }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  children,
  onPress,
  disabled,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 36,
          height: 36,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: tokens.inputBg,
          opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function AppTextInput(props: TextInputProps) {
  const { tokens } = useTheme();
  return (
    <TextInput
      placeholderTextColor={tokens.textMuted}
      {...props}
      style={[
        {
          borderWidth: 1,
          borderColor: tokens.border,
          borderRadius: 14,
          backgroundColor: tokens.inputBg,
          color: tokens.text,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 15,
          // Inputs follow the app font setting; an explicit fontFamily in
          // props.style (e.g. monospace JSON import) still wins below.
          fontFamily: tokens.fontFamily,
        },
        props.multiline ? { minHeight: 90, textAlignVertical: "top" } : null,
        props.style,
      ]}
    />
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          borderRadius: 999,
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: tokens.inputBg,
          padding: 3,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              borderRadius: 999,
              paddingVertical: 7,
              alignItems: "center",
              backgroundColor: active ? tokens.accent : "transparent",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: active ? tokens.onAccent : tokens.textSecondary }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CheckCircle({ checked, onPress, color, size = 26 }: { checked: boolean; onPress: () => void; color?: string; size?: number }) {
  const { tokens } = useTheme();
  const ringColor = color ?? tokens.accent;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: checked ? ringColor : tokens.borderStrong,
        backgroundColor: checked ? ringColor : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked ? <Check size={size - 12} color={tokens.scheme === "dark" ? tokens.onAccent : "#ffffff"} strokeWidth={3.5} /> : null}
    </Pressable>
  );
}

export function EmptyState({ message }: { message: string }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: tokens.borderStrong,
        borderRadius: 18,
        paddingVertical: 22,
        paddingHorizontal: 16,
        alignItems: "center",
      }}
    >
      <Text style={{ color: tokens.textMuted, fontSize: 13, textAlign: "center" }}>{message}</Text>
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  full,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: tokens.overlay }} onPress={onClose} />
      <View
        style={{
          backgroundColor: tokens.surfaceStrong,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderWidth: 1,
          borderColor: tokens.border,
          maxHeight: full ? "94%" : "82%",
          paddingBottom: 20,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: 10 }}>
          <View style={{ width: 42, height: 5, borderRadius: 999, backgroundColor: tokens.borderStrong }} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingHorizontal: 18,
            paddingTop: 12,
            paddingBottom: title ? 12 : 8,
          }}
        >
          {title ? (
            <Text style={{ fontSize: 18, fontWeight: "700", color: tokens.text, flex: 1 }} numberOfLines={1}>
              {title}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            onPress={onClose}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: tokens.border,
              backgroundColor: tokens.inputBg,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <X size={18} color={tokens.textSecondary} />
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 14 }}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function Row({ children, style, gap = 10 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function LoadingScreen() {
  const { tokens } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: tokens.bg }]}>
      <ActivityIndicator color={tokens.accent} size="large" />
      <Text style={{ color: tokens.textMuted, marginTop: 12, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>
        Loading
      </Text>
    </View>
  );
}

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 6 }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>{label}</Text>
        {description ? <Text style={{ color: tokens.textMuted, fontSize: 12, marginTop: 2 }}>{description}</Text> : null}
      </View>
      <View
        style={{
          width: 48,
          height: 28,
          borderRadius: 999,
          padding: 3,
          backgroundColor: value ? tokens.accent : tokens.inputBg,
          borderWidth: 1,
          borderColor: value ? tokens.accent : tokens.borderStrong,
          alignItems: value ? "flex-end" : "flex-start",
        }}
      >
        <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: value ? tokens.onAccent : tokens.textMuted }} />
      </View>
    </Pressable>
  );
}
