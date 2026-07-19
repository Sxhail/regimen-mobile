import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View, useWindowDimensions } from "react-native";

import { AppText as Text } from "../../ui/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, ChevronLeft, ChevronRight, FileJson, LayoutTemplate, Plus, Repeat, Search, X } from "lucide-react-native";

import type { CalendarImportEvent } from "../../model/calendar-import";
import { getDayKey } from "../../model/defaults";
import { addDays, dayKeyToDate, formatDateLabel, getMonthGridDates, getStartOfWeek, minutesToTimeValue, timeValueToMinutes } from "../../model/time";
import type { CalendarBlock, CalendarEvent } from "../../model/types";
import { useExecutionStore } from "../../store/executionStore";
import { useTheme } from "../../theme/ThemeContext";
import { AppButton, AppTextInput, EmptyState, IconButton, MutedLabel, Row, SegmentedControl, Sheet } from "../../ui/primitives";
import { ScreenHeader } from "../../components/ScreenHeader";
import {
  BlocksSheet,
  EventDetailSheet,
  EventEditorSheet,
  JsonImportSheet,
  RemindersSheet,
} from "./PlannerSheets";
import {
  HOUR_HEIGHT,
  createDraft,
  draftFromEvent,
  eventsOnDay,
  getNextAvailableStartTime,
  getTimedEventLayouts,
  resolveNonOverlappingDraft,
  type EventDraft,
} from "./plannerUtils";

type ViewMode = "month" | "week" | "day" | "agenda";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function PlannerScreen() {
  const { tokens, eventColors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const calendarEvents = useExecutionStore((store) => store.state.calendarEvents);
  const currentDayKey = useExecutionStore((store) => store.state.currentDayKey);
  const addCalendarEvent = useExecutionStore((store) => store.addCalendarEvent);
  const addCalendarEvents = useExecutionStore((store) => store.addCalendarEvents);
  const updateCalendarEvent = useExecutionStore((store) => store.updateCalendarEvent);
  const deleteCalendarEvent = useExecutionStore((store) => store.deleteCalendarEvent);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [cursorDate, setCursorDate] = useState(() => dayKeyToDate(currentDayKey));
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(Date.now());

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(() => createDraft(currentDayKey));
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [slotTarget, setSlotTarget] = useState<{ dayKey: string; startTime: string } | null>(null);
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const gridScrollRef = useRef<ScrollView | null>(null);
  const autoScrolledFor = useRef<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const visibleEvents = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return calendarEvents;
    }

    return calendarEvents.filter(
      (event) => event.title.toLowerCase().includes(trimmed) || event.notes.toLowerCase().includes(trimmed),
    );
  }, [calendarEvents, query]);

  const todayKey = getDayKey();
  const cursorDayKey = getDayKey(cursorDate);

  const moveCursor = (direction: -1 | 1) => {
    setCursorDate((current) => {
      if (viewMode === "month") {
        return new Date(current.getFullYear(), current.getMonth() + direction, 1);
      }
      if (viewMode === "day") {
        return addDays(current, direction);
      }
      return addDays(current, direction * 7);
    });
  };

  const rangeLabel = useMemo(() => {
    if (viewMode === "agenda") {
      return "Next 45 days";
    }
    if (viewMode === "month") {
      return formatDateLabel(cursorDate, { month: "long", year: "numeric" });
    }
    if (viewMode === "day") {
      return formatDateLabel(cursorDate, { weekday: "long", day: "numeric", month: "long" });
    }
    const weekStart = getStartOfWeek(cursorDate);
    const weekEnd = addDays(weekStart, 6);
    return `${formatDateLabel(weekStart, { month: "long", day: "numeric" })} – ${formatDateLabel(weekEnd, { day: "numeric" })}`;
  }, [cursorDate, viewMode]);

  const openCreate = (dayKey: string, startTime = "09:00") => {
    const durationMinutes = 60;
    const resolvedStart = getNextAvailableStartTime(visibleEvents, dayKey, startTime, durationMinutes);
    setDraft(createDraft(dayKey, resolvedStart));
    setEditorOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setDetailEvent(null);
    setDraft(draftFromEvent(event));
    setEditorOpen(true);
  };

  const saveDraft = () => {
    if (!draft.title.trim()) {
      Alert.alert("Missing title", "Give the event a title before saving.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDayKey) || !/^\d{2}:\d{2}$/.test(draft.startTime) || !/^\d{2}:\d{2}$/.test(draft.endTime)) {
      Alert.alert("Invalid date or time", "Use YYYY-MM-DD for dates and HH:mm for times.");
      return;
    }

    const normalized: EventDraft = {
      ...draft,
      title: draft.title.trim(),
      endDayKey: /^\d{4}-\d{2}-\d{2}$/.test(draft.endDayKey) && draft.endDayKey >= draft.startDayKey ? draft.endDayKey : draft.startDayKey,
      endTime:
        timeValueToMinutes(draft.endTime) > timeValueToMinutes(draft.startTime)
          ? draft.endTime
          : minutesToTimeValue(Math.min(24 * 60 - 1, timeValueToMinutes(draft.startTime) + 60)),
      repeatEndDayKey: draft.repeat === "none" ? null : draft.repeatEndDayKey,
    };

    const resolved = resolveNonOverlappingDraft(calendarEvents, normalized);
    const { id, ...payload } = resolved;

    if (id) {
      updateCalendarEvent(id, payload);
    } else {
      addCalendarEvent(payload);
    }

    setEditorOpen(false);
  };

  const confirmDelete = (event: CalendarEvent) => {
    Alert.alert("Delete event", `Delete "${event.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteCalendarEvent(event.id);
          setDetailEvent(null);
          setEditorOpen(false);
        },
      },
    ]);
  };

  const insertBlockAtSlot = (block: CalendarBlock) => {
    if (!slotTarget) {
      return;
    }

    const startTime = getNextAvailableStartTime(calendarEvents, slotTarget.dayKey, slotTarget.startTime, block.durationMinutes);
    const startMinutes = timeValueToMinutes(startTime);
    addCalendarEvent({
      title: block.title,
      startDayKey: slotTarget.dayKey,
      endDayKey: slotTarget.dayKey,
      startTime,
      endTime: minutesToTimeValue(Math.min(24 * 60 - 1, startMinutes + block.durationMinutes)),
      color: block.color,
      notes: block.notes,
      reminderMinutes: 10,
      repeat: "none",
      repeatEndDayKey: null,
    });
    setSlotTarget(null);
    setBlocksOpen(false);
  };

  const handleImported = (events: CalendarImportEvent[]) => {
    addCalendarEvents(events);
    const first = events[0];
    if (first) {
      setCursorDate(dayKeyToDate(first.startDayKey));
      setViewMode(events.length === 1 ? "day" : "week");
    }
  };

  // Auto-scroll the time grid to the current time (once per view/day).
  const scrollGridToNow = () => {
    const key = `${viewMode}-${cursorDayKey}`;
    if (autoScrolledFor.current === key) {
      return;
    }
    autoScrolledFor.current = key;

    const weekDates = viewMode === "week" ? Array.from({ length: 7 }, (_, i) => addDays(getStartOfWeek(cursorDate), i)) : [cursorDate];
    const showsToday = weekDates.some((date) => getDayKey(date) === todayKey);
    if (!showsToday) {
      return;
    }

    const nowDate = new Date(now);
    const offset = ((nowDate.getHours() * 60 + nowDate.getMinutes()) / 60) * HOUR_HEIGHT - 180;
    gridScrollRef.current?.scrollTo({ y: Math.max(0, offset), animated: false });
  };

  const renderEventCard = (event: CalendarEvent, top: number, height: number, columnWidth?: number) => {
    const palette = eventColors[event.color];
    const compact = height < 56 || (columnWidth !== undefined && columnWidth < 90);
    return (
      <Pressable
        key={event.id}
        onPress={() => setDetailEvent(event)}
        style={{
          position: "absolute",
          top,
          left: 2,
          right: 2,
          height,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: palette.base,
          backgroundColor: palette.soft,
          padding: compact ? 4 : 8,
          overflow: "hidden",
        }}
      >
        <Row gap={4}>
          <Text style={{ color: palette.softText, fontSize: compact ? 10 : 12, fontWeight: "700", flex: 1 }} numberOfLines={1}>
            {event.title}
          </Text>
          {event.repeat !== "none" ? <Repeat size={10} color={palette.softText} /> : null}
        </Row>
        {!compact ? (
          <Text style={{ color: palette.softText, fontSize: 10, opacity: 0.8 }} numberOfLines={1}>
            {event.startTime} – {event.endTime}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  const renderTimeGrid = (dates: Date[]) => {
    const nowDate = new Date(now);
    const nowTop = ((nowDate.getHours() * 60 + nowDate.getMinutes()) / 60) * HOUR_HEIGHT;
    const gutter = 46;
    const columnWidth = (width - 36 - gutter) / dates.length;

    return (
      <View style={{ flex: 1 }}>
        <Row style={{ paddingLeft: gutter }} gap={0}>
          {dates.map((date) => {
            const dayKey = getDayKey(date);
            const isToday = dayKey === todayKey;
            return (
              <Pressable
                key={dayKey}
                onPress={() => {
                  setCursorDate(date);
                  setViewMode("day");
                }}
                style={{ width: columnWidth, alignItems: "center", paddingVertical: 6 }}
              >
                <Text style={{ color: tokens.textMuted, fontSize: 10, textTransform: "uppercase" }}>
                  {formatDateLabel(date, { weekday: "short" })}
                </Text>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isToday ? tokens.accent : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: isToday ? tokens.onAccent : tokens.text,
                      fontSize: 13,
                      fontWeight: "700",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Row>

        <ScrollView ref={gridScrollRef} onLayout={scrollGridToNow} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", height: 24 * HOUR_HEIGHT, paddingBottom: 20 }}>
            <View style={{ width: gutter }}>
              {HOURS.map((hour) => (
                <View key={hour} style={{ height: HOUR_HEIGHT, alignItems: "flex-end", paddingRight: 6 }}>
                  <Text style={{ color: tokens.textMuted, fontSize: 10, fontVariant: ["tabular-nums"] }}>
                    {String(hour).padStart(2, "0")}:00
                  </Text>
                </View>
              ))}
            </View>

            {dates.map((date) => {
              const dayKey = getDayKey(date);
              const isToday = dayKey === todayKey;
              const layouts = getTimedEventLayouts(eventsOnDay(visibleEvents, dayKey));

              return (
                <View
                  key={dayKey}
                  style={{ width: columnWidth, borderLeftWidth: 0.5, borderLeftColor: tokens.border }}
                >
                  {HOURS.map((hour) => (
                    <Pressable
                      key={hour}
                      onPress={() => setSlotTarget({ dayKey, startTime: `${String(hour).padStart(2, "0")}:00` })}
                      style={{ height: HOUR_HEIGHT, borderBottomWidth: 0.5, borderBottomColor: tokens.border }}
                    />
                  ))}
                  {layouts.map(({ event, top, height }) => renderEventCard(event, top, height, columnWidth))}
                  {isToday ? (
                    <View pointerEvents="none" style={{ position: "absolute", top: nowTop, left: 0, right: 0 }}>
                      <View style={{ height: 2, backgroundColor: tokens.danger }} />
                      <View
                        style={{
                          position: "absolute",
                          top: -3,
                          left: -4,
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: tokens.danger,
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderMonthView = () => {
    const gridDates = getMonthGridDates(cursorDate.getFullYear(), cursorDate.getMonth());
    const cellWidth = (width - 36) / 7;

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Row gap={0}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <View key={label} style={{ width: cellWidth, alignItems: "center", paddingVertical: 6 }}>
              <Text style={{ color: tokens.textMuted, fontSize: 10, textTransform: "uppercase" }}>{label}</Text>
            </View>
          ))}
        </Row>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {gridDates.map((date) => {
            const dayKey = getDayKey(date);
            const inMonth = date.getMonth() === cursorDate.getMonth();
            const isToday = dayKey === todayKey;
            const dayEvents = eventsOnDay(visibleEvents, dayKey);

            return (
              <Pressable
                key={dayKey}
                onPress={() => {
                  setCursorDate(date);
                  setViewMode("day");
                }}
                onLongPress={() => openCreate(dayKey)}
                style={{
                  width: cellWidth,
                  minHeight: 74,
                  borderWidth: 0.5,
                  borderColor: tokens.border,
                  padding: 3,
                  gap: 2,
                  opacity: inMonth ? 1 : 0.4,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isToday ? tokens.accent : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: isToday ? tokens.onAccent : tokens.text,
                      fontSize: 11,
                      fontWeight: "600",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {date.getDate()}
                  </Text>
                </View>
                {dayEvents.slice(0, 2).map((event) => {
                  const palette = eventColors[event.color];
                  return (
                    <View key={event.id} style={{ borderRadius: 4, backgroundColor: palette.base, paddingHorizontal: 3, paddingVertical: 1 }}>
                      <Text style={{ color: palette.onBase, fontSize: 8, fontWeight: "700" }} numberOfLines={1}>
                        {event.title}
                      </Text>
                    </View>
                  );
                })}
                {dayEvents.length > 2 ? (
                  <Text style={{ color: tokens.textMuted, fontSize: 9 }}>+{dayEvents.length - 2} more</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: tokens.textMuted, fontSize: 11, textAlign: "center", paddingVertical: 10 }}>
          Tap a day to open it. Long-press to create an event.
        </Text>
      </ScrollView>
    );
  };

  const renderAgendaView = () => {
    const start = new Date(cursorDate);
    start.setHours(0, 0, 0, 0);
    const days: Array<{ date: Date; events: CalendarEvent[] }> = [];

    for (let offset = 0; offset < 45; offset += 1) {
      const date = addDays(start, offset);
      const events = eventsOnDay(visibleEvents, getDayKey(date));
      if (events.length > 0) {
        days.push({ date, events });
      }
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 140 }}>
        {days.length === 0 ? (
          <EmptyState message="No events match the current filters." />
        ) : (
          days.map(({ date, events }) => (
            <View key={getDayKey(date)} style={{ gap: 6 }}>
              <MutedLabel>{formatDateLabel(date, { weekday: "long", day: "numeric", month: "long" })}</MutedLabel>
              {events.map((event) => {
                const palette = eventColors[event.color];
                return (
                  <Pressable key={`${event.id}-${getDayKey(date)}`} onPress={() => setDetailEvent(event)}>
                    <Row
                      gap={10}
                      style={{
                        borderWidth: 1,
                        borderColor: tokens.border,
                        borderRadius: 14,
                        padding: 12,
                        backgroundColor: palette.soft,
                      }}
                    >
                      <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: palette.base }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>{event.title}</Text>
                        <Text style={{ color: tokens.textMuted, fontSize: 12 }}>
                          {event.startTime} – {event.endTime}
                        </Text>
                      </View>
                      {event.repeat !== "none" ? <Repeat size={13} color={tokens.textMuted} /> : null}
                    </Row>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(getStartOfWeek(cursorDate), index)),
    [cursorDate],
  );

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, paddingTop: insets.top + 10 }}>
      <View style={{ paddingHorizontal: 18, gap: 10 }}>
        <ScreenHeader title="Planner" />

        <Row style={{ justifyContent: "space-between" }}>
          <Row gap={6}>
            <IconButton onPress={() => moveCursor(-1)} accessibilityLabel="Previous">
              <ChevronLeft size={16} color={tokens.textSecondary} />
            </IconButton>
            <AppButton label="Today" small variant="outline" onPress={() => setCursorDate(new Date())} />
            <IconButton onPress={() => moveCursor(1)} accessibilityLabel="Next">
              <ChevronRight size={16} color={tokens.textSecondary} />
            </IconButton>
          </Row>
          <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "700" }}>{rangeLabel}</Text>
        </Row>

        <SegmentedControl<ViewMode>
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
            { value: "day", label: "Day" },
            { value: "agenda", label: "Agenda" },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />

        <Row style={{ justifyContent: "flex-end" }} gap={8}>
          <IconButton
            onPress={() => setSearchOpen((open) => !open)}
            accessibilityLabel="Search events"
            style={
              searchOpen || query.trim()
                ? { backgroundColor: tokens.accentSubtle, borderColor: tokens.accent }
                : undefined
            }
          >
            <Search size={16} color={searchOpen || query.trim() ? tokens.accent : tokens.textSecondary} />
          </IconButton>
          <IconButton onPress={() => setImportOpen(true)} accessibilityLabel="Import JSON">
            <FileJson size={16} color={tokens.textSecondary} />
          </IconButton>
          <IconButton
            onPress={() => {
              setSlotTarget(null);
              setBlocksOpen(true);
            }}
            accessibilityLabel="Blocks"
          >
            <LayoutTemplate size={16} color={tokens.textSecondary} />
          </IconButton>
          <IconButton onPress={() => setRemindersOpen(true)} accessibilityLabel="Reminders">
            <Bell size={16} color={tokens.textSecondary} />
          </IconButton>
        </Row>

        {searchOpen ? (
          <Row
            gap={8}
            style={{
              borderWidth: 1,
              borderColor: tokens.border,
              borderRadius: 999,
              backgroundColor: tokens.inputBg,
              paddingHorizontal: 12,
            }}
          >
            <Search size={14} color={tokens.textMuted} />
            <AppTextInput
              placeholder="Search events and notes"
              value={query}
              onChangeText={setQuery}
              autoFocus
              style={{ flex: 1, borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0 }}
            />
            <IconButton
              onPress={() => {
                setQuery("");
                setSearchOpen(false);
              }}
              accessibilityLabel="Clear search"
              style={{ width: 28, height: 28, borderWidth: 0, backgroundColor: "transparent" }}
            >
              <X size={14} color={tokens.textMuted} />
            </IconButton>
          </Row>
        ) : null}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 8 }}>
        {viewMode === "month" ? renderMonthView() : null}
        {viewMode === "week" ? renderTimeGrid(weekDates) : null}
        {viewMode === "day" ? renderTimeGrid([cursorDate]) : null}
        {viewMode === "agenda" ? renderAgendaView() : null}
      </View>

      <Pressable
        onPress={() => openCreate(cursorDayKey)}
        style={{
          position: "absolute",
          right: 20,
          bottom: 24 + insets.bottom,
          width: 58,
          height: 58,
          borderRadius: 999,
          backgroundColor: tokens.accent,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
        accessibilityLabel="Create event"
      >
        <Plus size={26} color={tokens.onAccent} />
      </Pressable>

      <EventEditorSheet
        visible={editorOpen}
        draft={draft}
        onChange={setDraft}
        onSave={saveDraft}
        onDelete={draft.id ? () => {
          const event = calendarEvents.find((item) => item.id === draft.id);
          if (event) {
            confirmDelete(event);
          }
        } : null}
        onClose={() => setEditorOpen(false)}
      />

      <EventDetailSheet
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onEdit={openEdit}
        onDelete={confirmDelete}
      />

      <Sheet visible={slotTarget !== null} onClose={() => setSlotTarget(null)} title={slotTarget ? `${slotTarget.dayKey} · ${slotTarget.startTime}` : ""}>
        <AppButton
          label="New event here"
          onPress={() => {
            if (slotTarget) {
              openCreate(slotTarget.dayKey, slotTarget.startTime);
              setSlotTarget(null);
            }
          }}
        />
        <AppButton label="Insert a block here" variant="outline" onPress={() => setBlocksOpen(true)} />
      </Sheet>

      <BlocksSheet
        visible={blocksOpen}
        onClose={() => setBlocksOpen(false)}
        onInsert={slotTarget ? insertBlockAtSlot : null}
      />

      <RemindersSheet visible={remindersOpen} onClose={() => setRemindersOpen(false)} />

      <JsonImportSheet visible={importOpen} onClose={() => setImportOpen(false)} onImported={handleImported} />
    </View>
  );
}
