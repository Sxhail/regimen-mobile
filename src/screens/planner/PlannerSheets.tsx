import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Play, Trash2 } from "lucide-react-native";

import { CALENDAR_IMPORT_EXAMPLE, CALENDAR_IMPORT_SCHEMA, parseCalendarImportJson, type CalendarImportEvent } from "../../model/calendar-import";
import { dayKeyToDate, formatDateLabel, minutesToTimeValue, timeValueToMinutes } from "../../model/time";
import type { CalendarBlock, CalendarColorKey, CalendarEvent } from "../../model/types";
import { useExecutionStore } from "../../store/executionStore";
import { useTheme } from "../../theme/ThemeContext";
import { AppButton, AppTextInput, EmptyState, IconButton, MutedLabel, Row, Sheet } from "../../ui/primitives";
import { COLOR_KEYS, REMINDER_OPTIONS, REPEAT_OPTIONS, getUpcomingReminders, type EventDraft } from "./plannerUtils";

export function ColorPicker({ value, onChange }: { value: CalendarColorKey; onChange: (color: CalendarColorKey) => void }) {
  const { tokens, eventColors } = useTheme();
  return (
    <Row gap={10} style={{ flexWrap: "wrap" }}>
      {COLOR_KEYS.map((colorKey) => {
        const palette = eventColors[colorKey];
        const active = value === colorKey;
        return (
          <Pressable key={colorKey} onPress={() => onChange(colorKey)} style={{ alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                backgroundColor: palette.base,
                borderWidth: active ? 3 : 1,
                borderColor: active ? tokens.text : tokens.border,
              }}
            />
            <Text style={{ color: active ? tokens.text : tokens.textMuted, fontSize: 11 }}>{palette.label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

function ChipRow<T>({
  options,
  selected,
  onSelect,
  isEqual,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
  isEqual?: (left: T, right: T) => boolean;
}) {
  const { tokens } = useTheme();
  const equals = isEqual ?? ((left: T, right: T) => left === right);
  return (
    <Row gap={8} style={{ flexWrap: "wrap" }}>
      {options.map((option) => {
        const active = equals(option.value, selected);
        return (
          <Pressable
            key={option.label}
            onPress={() => onSelect(option.value)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? tokens.accent : tokens.border,
              backgroundColor: active ? tokens.accentSubtle : "transparent",
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: active ? tokens.text : tokens.textSecondary, fontSize: 13 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

export function EventEditorSheet({
  visible,
  draft,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  draft: EventDraft;
  onChange: (draft: EventDraft) => void;
  onSave: () => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const startMinutes = timeValueToMinutes(draft.startTime);
  const endMinutes = timeValueToMinutes(draft.endTime);
  const lengthMinutes = Math.max(15, endMinutes - startMinutes);

  const setLength = (minutes: number) => {
    const clamped = Math.max(15, Math.min(720, minutes));
    onChange({ ...draft, endTime: minutesToTimeValue(Math.min(24 * 60 - 1, startMinutes + clamped)) });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={draft.id ? "Edit event" : "New event"} full>
      <MutedLabel>Title</MutedLabel>
      <AppTextInput placeholder="Event title" value={draft.title} onChangeText={(title) => onChange({ ...draft, title })} />

      <Row gap={10}>
        <View style={{ flex: 1, gap: 6 }}>
          <MutedLabel>Start date</MutedLabel>
          <AppTextInput
            placeholder="YYYY-MM-DD"
            value={draft.startDayKey}
            autoCapitalize="none"
            onChangeText={(startDayKey) => onChange({ ...draft, startDayKey, endDayKey: startDayKey > draft.endDayKey ? startDayKey : draft.endDayKey })}
          />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <MutedLabel>End date</MutedLabel>
          <AppTextInput
            placeholder="YYYY-MM-DD"
            value={draft.endDayKey}
            autoCapitalize="none"
            onChangeText={(endDayKey) => onChange({ ...draft, endDayKey })}
          />
        </View>
      </Row>

      <Row gap={10}>
        <View style={{ flex: 1, gap: 6 }}>
          <MutedLabel>Start time</MutedLabel>
          <AppTextInput
            placeholder="HH:mm"
            value={draft.startTime}
            autoCapitalize="none"
            onChangeText={(startTime) => onChange({ ...draft, startTime })}
          />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <MutedLabel>End time</MutedLabel>
          <AppTextInput
            placeholder="HH:mm"
            value={draft.endTime}
            autoCapitalize="none"
            onChangeText={(endTime) => onChange({ ...draft, endTime })}
          />
        </View>
      </Row>

      <View style={{ gap: 6 }}>
        <MutedLabel>Length: {lengthMinutes} min</MutedLabel>
        <Row gap={8}>
          <AppButton label="−15" small variant="outline" onPress={() => setLength(lengthMinutes - 15)} />
          <AppButton label="+15" small variant="outline" onPress={() => setLength(lengthMinutes + 15)} />
          <AppButton label="30m" small variant="outline" onPress={() => setLength(30)} />
          <AppButton label="1h" small variant="outline" onPress={() => setLength(60)} />
          <AppButton label="2h" small variant="outline" onPress={() => setLength(120)} />
        </Row>
      </View>

      <View style={{ gap: 6 }}>
        <MutedLabel>Color</MutedLabel>
        <ColorPicker value={draft.color} onChange={(color) => onChange({ ...draft, color })} />
      </View>

      <View style={{ gap: 6 }}>
        <MutedLabel>Reminder</MutedLabel>
        <ChipRow
          options={REMINDER_OPTIONS}
          selected={draft.reminderMinutes}
          onSelect={(reminderMinutes) => onChange({ ...draft, reminderMinutes })}
        />
      </View>

      <View style={{ gap: 6 }}>
        <MutedLabel>Repeat</MutedLabel>
        <ChipRow options={REPEAT_OPTIONS} selected={draft.repeat} onSelect={(repeat) => onChange({ ...draft, repeat, repeatEndDayKey: repeat === "none" ? null : draft.repeatEndDayKey })} />
      </View>

      {draft.repeat !== "none" ? (
        <View style={{ gap: 6 }}>
          <MutedLabel>Repeat ends (optional)</MutedLabel>
          <AppTextInput
            placeholder="YYYY-MM-DD"
            value={draft.repeatEndDayKey ?? ""}
            autoCapitalize="none"
            onChangeText={(value) => onChange({ ...draft, repeatEndDayKey: value.trim() ? value.trim() : null })}
          />
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <MutedLabel>Notes</MutedLabel>
        <AppTextInput
          placeholder="Notes"
          value={draft.notes}
          onChangeText={(notes) => onChange({ ...draft, notes })}
          multiline
        />
      </View>

      <Row gap={10}>
        <AppButton label={draft.id ? "Save changes" : "Create event"} onPress={onSave} style={{ flex: 1 }} />
        {onDelete ? <AppButton label="Delete" variant="danger" onPress={onDelete} /> : null}
      </Row>
      <Text style={{ color: tokens.textMuted, fontSize: 12, textAlign: "center" }}>
        Overlapping events are shifted to the next free slot automatically.
      </Text>
    </Sheet>
  );
}

export function EventDetailSheet({
  event,
  onClose,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}) {
  const { tokens, eventColors } = useTheme();
  const startCalendarEvent = useExecutionStore((store) => store.startCalendarEvent);

  if (!event) {
    return null;
  }

  const palette = eventColors[event.color];
  const dateLabel = formatDateLabel(dayKeyToDate(event.startDayKey), { weekday: "long", day: "numeric", month: "long" });
  const reminderLabel = REMINDER_OPTIONS.find((option) => option.value === event.reminderMinutes)?.label ?? "None";
  const repeatLabel = REPEAT_OPTIONS.find((option) => option.value === event.repeat)?.label ?? "None";

  return (
    <Sheet visible onClose={onClose}>
      <Row gap={10}>
        <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: palette.base }} />
        <Text style={{ color: tokens.text, fontSize: 19, fontWeight: "700", flex: 1 }}>{event.title}</Text>
      </Row>
      <Text style={{ color: tokens.textSecondary, fontSize: 14 }}>
        {dateLabel} · {event.startTime} – {event.endTime}
      </Text>
      <Text style={{ color: tokens.textMuted, fontSize: 13 }}>
        Repeat: {repeatLabel}
        {event.repeatEndDayKey ? ` until ${event.repeatEndDayKey}` : ""} · Reminder: {reminderLabel}
      </Text>
      {event.notes ? <Text style={{ color: tokens.textSecondary, fontSize: 14, lineHeight: 20 }}>{event.notes}</Text> : null}
      <Row gap={10}>
        <AppButton
          label="Start now"
          icon={<Play size={14} color={tokens.onAccent} />}
          onPress={() => {
            startCalendarEvent(event.id);
            onClose();
          }}
          style={{ flex: 1 }}
        />
        <AppButton label="Edit" variant="outline" onPress={() => onEdit(event)} />
        <AppButton label="Delete" variant="danger" onPress={() => onDelete(event)} />
      </Row>
    </Sheet>
  );
}

export function BlocksSheet({
  visible,
  onClose,
  onInsert,
}: {
  visible: boolean;
  onClose: () => void;
  onInsert: ((block: CalendarBlock) => void) | null;
}) {
  const { tokens, eventColors } = useTheme();
  const calendarBlocks = useExecutionStore((store) => store.state.calendarBlocks);
  const addCalendarBlock = useExecutionStore((store) => store.addCalendarBlock);
  const deleteCalendarBlock = useExecutionStore((store) => store.deleteCalendarBlock);

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [color, setColor] = useState<CalendarColorKey>("sage");
  const [notes, setNotes] = useState("");

  const createBlock = () => {
    if (!title.trim()) {
      return;
    }
    addCalendarBlock({ title: title.trim(), durationMinutes: duration, color, notes: notes.trim() });
    setTitle("");
    setDuration(60);
    setColor("sage");
    setNotes("");
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Blocks" full>
      <Text style={{ color: tokens.textMuted, fontSize: 13 }}>
        Reusable templates. {onInsert ? "Tap one to insert it at the selected slot." : "Insert them from any time slot in the grid."}
      </Text>

      {calendarBlocks.length === 0 ? (
        <EmptyState message="No blocks yet. Create one below." />
      ) : (
        calendarBlocks.map((block) => {
          const palette = eventColors[block.color];
          return (
            <Pressable key={block.id} onPress={onInsert ? () => onInsert(block) : undefined}>
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
                  <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>{block.title}</Text>
                  <Text style={{ color: tokens.textMuted, fontSize: 12 }}>
                    {block.durationMinutes} min{block.notes ? ` · ${block.notes}` : ""}
                  </Text>
                </View>
                <IconButton onPress={() => deleteCalendarBlock(block.id)} accessibilityLabel="Delete block">
                  <Trash2 size={14} color={tokens.danger} />
                </IconButton>
              </Row>
            </Pressable>
          );
        })
      )}

      <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: tokens.border, paddingTop: 14 }}>
        <MutedLabel>New block</MutedLabel>
        <AppTextInput placeholder="Block title" value={title} onChangeText={setTitle} />
        <Row gap={8}>
          <MutedLabel style={{ flex: 1 }}>Duration: {duration} min</MutedLabel>
          <AppButton label="−15" small variant="outline" onPress={() => setDuration((value) => Math.max(15, value - 15))} />
          <AppButton label="+15" small variant="outline" onPress={() => setDuration((value) => Math.min(480, value + 15))} />
        </Row>
        <ColorPicker value={color} onChange={setColor} />
        <AppTextInput placeholder="Notes (optional)" value={notes} onChangeText={setNotes} />
        <AppButton label="Add block" onPress={createBlock} />
      </View>
    </Sheet>
  );
}

export function RemindersSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { tokens, eventColors } = useTheme();
  const calendarEvents = useExecutionStore((store) => store.state.calendarEvents);
  const upcoming = getUpcomingReminders(calendarEvents);

  return (
    <Sheet visible={visible} onClose={onClose} title="Upcoming reminders">
      {upcoming.length === 0 ? (
        <EmptyState message="No upcoming reminders in the next 45 days." />
      ) : (
        upcoming.map(({ event, dayKey, fireAt }) => {
          const palette = eventColors[event.color];
          return (
            <Row key={`${event.id}-${dayKey}`} gap={10}>
              <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: palette.base }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: tokens.text, fontSize: 15, fontWeight: "600" }}>{event.title}</Text>
                <Text style={{ color: tokens.textMuted, fontSize: 12 }}>
                  {formatDateLabel(new Date(fireAt), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {" · "}event at {event.startTime}
                </Text>
              </View>
            </Row>
          );
        })
      )}
      <Text style={{ color: tokens.textMuted, fontSize: 12 }}>
        Reminders fire as local notifications on your device.
      </Text>
    </Sheet>
  );
}

export function JsonImportSheet({
  visible,
  onClose,
  onImported,
}: {
  visible: boolean;
  onClose: () => void;
  onImported: (events: CalendarImportEvent[]) => void;
}) {
  const { tokens } = useTheme();
  const [jsonText, setJsonText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [schemaVisible, setSchemaVisible] = useState(false);

  const runImport = () => {
    const result = parseCalendarImportJson(jsonText);
    if (result.ok) {
      onImported(result.events);
      setSuccessCount(result.events.length);
      setErrors([]);
      setJsonText("");
    } else {
      setErrors(result.errors.slice(0, 8));
      setSuccessCount(null);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) {
      return;
    }

    try {
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      setJsonText(content);
      setErrors([]);
      setSuccessCount(null);
    } catch {
      setErrors(["Could not read the selected file."]);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Import events from JSON" full>
      <AppTextInput
        placeholder='{"schemaVersion": 1, "events": [...]}'
        value={jsonText}
        onChangeText={(value) => {
          setJsonText(value);
          setSuccessCount(null);
        }}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        style={{ minHeight: 140, fontFamily: "monospace", fontSize: 12 }}
      />

      <Row gap={8} style={{ flexWrap: "wrap" }}>
        <AppButton label="Upload JSON" small variant="outline" onPress={pickFile} />
        <AppButton
          label="Load example"
          small
          variant="outline"
          onPress={() => {
            setJsonText(JSON.stringify(CALENDAR_IMPORT_EXAMPLE, null, 2));
            setErrors([]);
            setSuccessCount(null);
          }}
        />
        <AppButton
          label="Clear"
          small
          variant="ghost"
          onPress={() => {
            setJsonText("");
            setErrors([]);
            setSuccessCount(null);
          }}
        />
        <AppButton label={schemaVisible ? "Hide schema" : "Show schema"} small variant="ghost" onPress={() => setSchemaVisible((value) => !value)} />
      </Row>

      <AppButton label="Import events" onPress={runImport} disabled={!jsonText.trim()} />

      {successCount !== null ? (
        <Text style={{ color: tokens.success, fontSize: 13, fontWeight: "600" }}>
          Imported {successCount} event{successCount === 1 ? "" : "s"}.
        </Text>
      ) : null}

      {errors.length > 0 ? (
        <View style={{ gap: 4 }}>
          {errors.map((error) => (
            <Text key={error} style={{ color: tokens.danger, fontSize: 12 }}>
              · {error}
            </Text>
          ))}
        </View>
      ) : null}

      {schemaVisible ? (
        <View style={{ backgroundColor: tokens.inputBg, borderRadius: 12, padding: 10 }}>
          <Text style={{ color: tokens.textSecondary, fontSize: 10, fontFamily: "monospace" }}>
            {JSON.stringify(CALENDAR_IMPORT_SCHEMA, null, 2)}
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}
