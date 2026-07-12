import { getDayKey } from "../../model/defaults";
import { isCalendarEventOnDay } from "../../model/logic";
import { addDays, minutesToTimeValue, timeValueToMinutes } from "../../model/time";
import type { CalendarColorKey, CalendarEvent, CalendarRepeat } from "../../model/types";

export const HOUR_HEIGHT = 64;
export const MIN_EVENT_HEIGHT = 44;

export type EventDraft = {
  id: string | null;
  title: string;
  startDayKey: string;
  endDayKey: string;
  startTime: string;
  endTime: string;
  color: CalendarColorKey;
  notes: string;
  reminderMinutes: number | null;
  repeat: CalendarRepeat;
  repeatEndDayKey: string | null;
};

export const REMINDER_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "None" },
  { value: 0, label: "At start" },
  { value: 5, label: "5 min before" },
  { value: 10, label: "10 min before" },
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

export const REPEAT_OPTIONS: Array<{ value: CalendarRepeat; label: string }> = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const COLOR_KEYS: CalendarColorKey[] = ["sage", "mint", "amber", "rose", "sky", "violet"];

export function createDraft(dayKey: string, startTime = "09:00"): EventDraft {
  const startMinutes = timeValueToMinutes(startTime);
  return {
    id: null,
    title: "",
    startDayKey: dayKey,
    endDayKey: dayKey,
    startTime,
    endTime: minutesToTimeValue(Math.min(24 * 60 - 1, startMinutes + 60)),
    color: "sage",
    notes: "",
    reminderMinutes: 10,
    repeat: "none",
    repeatEndDayKey: null,
  };
}

export function draftFromEvent(event: CalendarEvent): EventDraft {
  return {
    id: event.id,
    title: event.title,
    startDayKey: event.startDayKey,
    endDayKey: event.endDayKey,
    startTime: event.startTime,
    endTime: event.endTime,
    color: event.color,
    notes: event.notes,
    reminderMinutes: event.reminderMinutes,
    repeat: event.repeat,
    repeatEndDayKey: event.repeatEndDayKey,
  };
}

export function eventsOnDay(events: CalendarEvent[], dayKey: string) {
  return events
    .filter((event) => isCalendarEventOnDay(event, dayKey))
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
}

// Auto-shift a start time past events already occupying the slot (web parity).
export function getNextAvailableStartTime(events: CalendarEvent[], dayKey: string, startTime: string, durationMinutes: number) {
  let candidateStart = timeValueToMinutes(startTime);
  const dayEvents = eventsOnDay(events, dayKey);

  for (let guard = 0; guard < 48; guard += 1) {
    const candidateEnd = candidateStart + durationMinutes;
    const overlapping = dayEvents.find((event) => {
      const eventStart = timeValueToMinutes(event.startTime);
      const eventEnd = Math.max(eventStart + 15, timeValueToMinutes(event.endTime));
      return candidateStart < eventEnd && candidateEnd > eventStart;
    });

    if (!overlapping) {
      break;
    }

    candidateStart = Math.max(candidateStart + 15, timeValueToMinutes(overlapping.endTime));
    if (candidateStart + durationMinutes > 24 * 60 - 1) {
      candidateStart = timeValueToMinutes(startTime);
      break;
    }
  }

  return minutesToTimeValue(candidateStart);
}

// Shift the draft's start past overlapping same-day events on save (excluding itself).
export function resolveNonOverlappingDraft(events: CalendarEvent[], draft: EventDraft): EventDraft {
  const others = events.filter((event) => event.id !== draft.id);
  const durationMinutes = Math.max(15, timeValueToMinutes(draft.endTime) - timeValueToMinutes(draft.startTime));
  const nextStart = getNextAvailableStartTime(others, draft.startDayKey, draft.startTime, durationMinutes);

  if (nextStart === draft.startTime) {
    return draft;
  }

  const nextStartMinutes = timeValueToMinutes(nextStart);
  return {
    ...draft,
    startTime: nextStart,
    endTime: minutesToTimeValue(Math.min(24 * 60 - 1, nextStartMinutes + durationMinutes)),
  };
}

export type TimedEventLayout = {
  event: CalendarEvent;
  top: number;
  height: number;
};

// Visual cascade: overlapping events stack downward with a 4px gap (web parity).
export function getTimedEventLayouts(events: CalendarEvent[]): TimedEventLayout[] {
  const sorted = [...events].sort((left, right) => left.startTime.localeCompare(right.startTime));
  const layouts: TimedEventLayout[] = [];
  let previousBottom = -Infinity;

  for (const event of sorted) {
    const startMinutes = timeValueToMinutes(event.startTime);
    const endMinutes = Math.max(startMinutes + 15, timeValueToMinutes(event.endTime));
    let top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max(MIN_EVENT_HEIGHT, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT - 2);

    if (top < previousBottom + 4) {
      top = previousBottom + 4;
    }

    layouts.push({ event, top, height });
    previousBottom = top + height;
  }

  return layouts;
}

export function getUpcomingReminders(events: CalendarEvent[], daysAhead = 45, limit = 6) {
  const occurrences: Array<{ event: CalendarEvent; dayKey: string; fireAt: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = Date.now();

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const date = addDays(today, offset);
    const dayKey = getDayKey(date);

    for (const event of events) {
      if (event.reminderMinutes === null || !isCalendarEventOnDay(event, dayKey)) {
        continue;
      }

      const start = new Date(date);
      start.setMinutes(timeValueToMinutes(event.startTime));
      const fireAt = start.getTime() - event.reminderMinutes * 60_000;
      if (fireAt > now) {
        occurrences.push({ event, dayKey, fireAt });
      }
    }
  }

  return occurrences.sort((left, right) => left.fireAt - right.fireAt).slice(0, limit);
}
