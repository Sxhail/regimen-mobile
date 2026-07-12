import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { getDayKey } from "../model/defaults";
import { useDayOutcomeByKey } from "../store/derived";
import { useTheme } from "../theme/ThemeContext";
import { Card, IconButton, MutedLabel, Row, Subtitle } from "../ui/primitives";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function LifeScreen() {
  const { tokens } = useTheme();
  const outcomes = useDayOutcomeByKey();
  const [year, setYear] = useState(new Date().getFullYear());

  const todayKey = getDayKey();
  const wonColor = tokens.scheme === "dark" ? "#35c79f" : "#1f9d76";
  const lostColor = tokens.scheme === "dark" ? "#f27067" : "#d24a41";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 140, gap: 16 }}
    >
      <Subtitle>
        A year view of won and lost days. Green means the day was won. Red means the day was logged but lost.
      </Subtitle>

      <Card style={{ gap: 14 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Row gap={10}>
            <IconButton onPress={() => setYear((value) => value - 1)} accessibilityLabel="Previous year">
              <ChevronLeft size={16} color={tokens.textSecondary} />
            </IconButton>
            <Text style={{ color: tokens.text, fontSize: 16, fontWeight: "700", letterSpacing: 3 }}>{year}</Text>
            <IconButton onPress={() => setYear((value) => value + 1)} accessibilityLabel="Next year">
              <ChevronRight size={16} color={tokens.textSecondary} />
            </IconButton>
          </Row>
          <Row gap={10}>
            <Row gap={4}>
              <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: wonColor }} />
              <Text style={{ color: tokens.textMuted, fontSize: 11 }}>Won day</Text>
            </Row>
            <Row gap={4}>
              <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: lostColor }} />
              <Text style={{ color: tokens.textMuted, fontSize: 11 }}>Lost day</Text>
            </Row>
          </Row>
        </Row>

        {MONTH_NAMES.map((monthName, monthIndex) => {
          const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
          return (
            <View key={monthName} style={{ gap: 8 }}>
              <MutedLabel style={{ letterSpacing: 1.4 }}>{monthName}</MutedLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                  const dayKey = getDayKey(new Date(year, monthIndex, dayIndex + 1));
                  const outcome = outcomes.get(dayKey);
                  const isToday = dayKey === todayKey;
                  const background = outcome?.won
                    ? wonColor
                    : outcome?.hasData
                      ? lostColor
                      : tokens.inputBg;
                  return (
                    <View
                      key={dayKey}
                      style={{
                        width: 34,
                        height: 30,
                        borderRadius: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: background,
                        borderWidth: isToday ? 1.5 : 0.5,
                        borderColor: isToday ? tokens.accent : tokens.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontVariant: ["tabular-nums"],
                          color: outcome?.hasData ? "#ffffff" : tokens.textMuted,
                          fontWeight: outcome?.hasData ? "700" : "400",
                        }}
                      >
                        {dayIndex + 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}
