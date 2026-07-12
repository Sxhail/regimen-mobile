import type { CalendarColorKey, CalendarEvent, CalendarRepeat } from "./types";

export type CalendarImportEvent = Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">;

type CalendarImportResult =
  | { ok: true; events: CalendarImportEvent[] }
  | { ok: false; errors: string[] };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const COLOR_KEYS = ["sage", "mint", "amber", "rose", "sky", "violet"] as const;
const REPEAT_VALUES = ["none", "daily", "weekly", "monthly", "yearly"] as const;
const DEFAULT_COLOR: CalendarColorKey = "sage";
const DEFAULT_REMINDER_MINUTES = 10;
const MAX_IMPORT_EVENTS = 500;

export const CALENDAR_IMPORT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Regimen Calendar Import",
  type: "object",
  required: ["schemaVersion", "events"],
  properties: {
    schemaVersion: { const: 1 },
    timezone: {
      type: "string",
      description: "Optional IANA timezone label for the generator. Dates and times are imported as local calendar values.",
      examples: ["Asia/Dubai", "America/New_York"],
    },
    events: {
      type: "array",
      minItems: 1,
      maxItems: MAX_IMPORT_EVENTS,
      items: {
        type: "object",
        required: ["title", "startDate", "startTime"],
        properties: {
          title: { type: "string", minLength: 1 },
          startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          endDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          endTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          durationMinutes: { type: "integer", minimum: 15, maximum: 1439 },
          color: { type: "string", enum: COLOR_KEYS },
          notes: { type: "string" },
          reminderMinutes: {
            anyOf: [
              { type: "integer", minimum: 0 },
              { type: "null" },
            ],
          },
          repeat: { type: "string", enum: REPEAT_VALUES },
          repeatEndDate: {
            anyOf: [
              { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
              { type: "null" },
            ],
          },
        },
        anyOf: [
          { required: ["endTime"] },
          { required: ["durationMinutes"] },
        ],
      },
    },
  },
} as const;

export const CALENDAR_IMPORT_EXAMPLE = {
  schemaVersion: 1,
  timezone: "Asia/Dubai",
  events: [
    {
      title: "Strength training",
      startDate: "2026-06-01",
      startTime: "07:00",
      endTime: "08:15",
      color: "mint",
      notes: "Lower body focus. Warm up first.",
      reminderMinutes: 10,
      repeat: "weekly",
      repeatEndDate: "2026-07-27",
    },
    {
      title: "Deep work block",
      startDate: "2026-06-01",
      startTime: "10:00",
      durationMinutes: 120,
      color: "sky",
      reminderMinutes: null,
      repeat: "none",
    },
  ],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateValue(value: unknown) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function timeToMinutes(value: string) {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeValue(minutes: number) {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.floor(minutes)));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function isTimeValue(value: unknown) {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
    return false;
  }

  const [hours = 0, minutes = 0] = value.split(":").map(Number);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : null;
}

function readDate(record: Record<string, unknown>, key: string, path: string, errors: string[]) {
  const value = readString(record, key);

  if (!value) {
    return null;
  }

  if (!isDateValue(value)) {
    errors.push(`${path}.${key} must be a real date in YYYY-MM-DD format.`);
    return null;
  }

  return value;
}

function readTime(record: Record<string, unknown>, key: string, path: string, errors: string[]) {
  const value = readString(record, key);

  if (!value) {
    return null;
  }

  if (!isTimeValue(value)) {
    errors.push(`${path}.${key} must be a valid 24-hour time in HH:mm format.`);
    return null;
  }

  return value;
}

function parseImportEvent(value: unknown, index: number, errors: string[]): CalendarImportEvent | null {
  const path = `events[${index}]`;

  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  const title = readString(value, "title");
  if (!title) {
    errors.push(`${path}.title is required.`);
  }

  const rawStartDate = readString(value, "startDate");
  const startDayKey = readDate(value, "startDate", path, errors);
  if (!rawStartDate) {
    errors.push(`${path}.startDate is required.`);
  }

  const endDayKey = readDate(value, "endDate", path, errors) ?? startDayKey;
  if (startDayKey && endDayKey && endDayKey < startDayKey) {
    errors.push(`${path}.endDate cannot be before startDate.`);
  }

  const rawStartTime = readString(value, "startTime");
  const startTime = readTime(value, "startTime", path, errors);
  if (!rawStartTime) {
    errors.push(`${path}.startTime is required.`);
  }

  const explicitEndTime = readTime(value, "endTime", path, errors);
  const durationMinutes = value.durationMinutes;
  let endTime = explicitEndTime;

  if (!endTime) {
    if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes)) {
      errors.push(`${path} requires either endTime or integer durationMinutes.`);
    } else if (durationMinutes < 15 || durationMinutes > 1439) {
      errors.push(`${path}.durationMinutes must be between 15 and 1439.`);
    } else if (startTime) {
      const endMinutes = timeToMinutes(startTime) + durationMinutes;
      if (endMinutes > 24 * 60 - 1) {
        errors.push(`${path}.durationMinutes pushes the event past 23:59.`);
      } else {
        endTime = minutesToTimeValue(endMinutes);
      }
    }
  }

  if (startTime && endTime && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    errors.push(`${path}.endTime must be after startTime.`);
  }

  const colorValue = readString(value, "color") ?? DEFAULT_COLOR;
  const color = COLOR_KEYS.includes(colorValue as CalendarColorKey) ? colorValue as CalendarColorKey : null;
  if (!color) {
    errors.push(`${path}.color must be one of: ${COLOR_KEYS.join(", ")}.`);
  }

  const repeatValue = readString(value, "repeat") ?? "none";
  const repeat = REPEAT_VALUES.includes(repeatValue as CalendarRepeat) ? repeatValue as CalendarRepeat : null;
  if (!repeat) {
    errors.push(`${path}.repeat must be one of: ${REPEAT_VALUES.join(", ")}.`);
  }

  const repeatEndValue = value.repeatEndDate;
  let repeatEndDayKey: string | null = null;
  if (repeatEndValue !== undefined && repeatEndValue !== null) {
    repeatEndDayKey = readDate(value, "repeatEndDate", path, errors);
  }

  if (repeatEndDayKey && startDayKey && repeatEndDayKey < startDayKey) {
    errors.push(`${path}.repeatEndDate cannot be before startDate.`);
  }

  const reminderValue = value.reminderMinutes;
  const reminderMinutes = reminderValue === undefined
    ? DEFAULT_REMINDER_MINUTES
    : reminderValue === null
      ? null
      : typeof reminderValue === "number" && Number.isInteger(reminderValue) && reminderValue >= 0
        ? reminderValue
        : undefined;

  if (reminderMinutes === undefined) {
    errors.push(`${path}.reminderMinutes must be a non-negative integer or null.`);
  }

  if (!title || !startDayKey || !endDayKey || !startTime || !endTime || !color || !repeat || reminderMinutes === undefined) {
    return null;
  }

  return {
    title,
    startDayKey,
    endDayKey,
    startTime,
    endTime,
    color,
    notes: readString(value, "notes") ?? "",
    reminderMinutes,
    repeat,
    repeatEndDayKey: repeat === "none" ? null : repeatEndDayKey,
  };
}

export function parseCalendarImportJson(source: string): CalendarImportResult {
  let payload: unknown;

  try {
    payload = JSON.parse(source);
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : "JSON could not be parsed."],
    };
  }

  if (!isRecord(payload)) {
    return { ok: false, errors: ["Import root must be an object."] };
  }

  const errors: string[] = [];

  if (payload.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1.");
  }

  if (payload.timezone !== undefined && typeof payload.timezone !== "string") {
    errors.push("timezone must be a string when provided.");
  }

  if (!Array.isArray(payload.events)) {
    errors.push("events must be an array.");
    return { ok: false, errors };
  }

  if (payload.events.length === 0) {
    errors.push("events must include at least one event.");
  }

  if (payload.events.length > MAX_IMPORT_EVENTS) {
    errors.push(`events cannot include more than ${MAX_IMPORT_EVENTS} events.`);
  }

  const events = payload.events
    .slice(0, MAX_IMPORT_EVENTS)
    .map((event, index) => parseImportEvent(event, index, errors))
    .filter((event): event is CalendarImportEvent => Boolean(event));

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, events };
}
