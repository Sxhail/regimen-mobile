import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { BookOpen, ChevronRight, Flag, History, Kanban, Settings, Sparkles } from "lucide-react-native";

import { useTheme } from "../theme/ThemeContext";
import { Card, Row } from "../ui/primitives";
import { ScreenHeader } from "../components/ScreenHeader";

const LINKS: Array<{ href: Href; label: string; description: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = [
  { href: "/board", label: "Board", description: "Kanban: backlog, in progress, done", icon: Kanban },
  { href: "/goals", label: "Goals", description: "Yearly, monthly, and weekly goals", icon: Flag },
  { href: "/life", label: "Life", description: "Won and lost days across the year", icon: Sparkles },
  { href: "/journal", label: "Journal", description: "Daily and monthly reflections", icon: BookOpen },
  { href: "/history", label: "History", description: "Archived days and snapshots", icon: History },
  { href: "/settings", label: "Settings", description: "Theme, accent, focus, custom inputs", icon: Settings },
];

export function MoreScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={{ padding: 18, paddingTop: insets.top + 10, paddingBottom: 140, gap: 10 }}
    >
      <ScreenHeader title="More" subtitle="Everything else in Execution OS." />
      {LINKS.map(({ href, label, description, icon: Icon }) => (
        <Pressable key={label} onPress={() => router.push(href)}>
          <Card style={{ paddingVertical: 14 }}>
            <Row gap={14}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: tokens.accentSubtle,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={19} color={tokens.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: tokens.text, fontSize: 16, fontWeight: "700" }}>{label}</Text>
                <Text style={{ color: tokens.textMuted, fontSize: 12 }}>{description}</Text>
              </View>
              <ChevronRight size={18} color={tokens.textMuted} />
            </Row>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
