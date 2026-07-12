export function timeValueToMinutes(value: string) {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return Math.max(0, Math.min(24 * 60, hours * 60 + minutes));
}

export function minutesToTimeValue(minutes: number) {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.floor(minutes)));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function dayKeyToDate(dayKey: string) {
  const [year = 0, month = 1, day = 1] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function diffCalendarDays(leftDayKey: string, rightDayKey: string) {
  const left = dayKeyToDate(leftDayKey);
  const right = dayKeyToDate(rightDayKey);

  return Math.round((left.getTime() - right.getTime()) / 86_400_000);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function formatDateLabel(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function formatSeconds(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function formatTimeLabel(time: string) {
  return time;
}

// Monday-start week, matching the web planner.
export function getStartOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

export function getMonthGridDates(year: number, monthIndex: number) {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const gridStart = getStartOfWeek(firstOfMonth);
  const dates: Date[] = [];

  for (let index = 0; index < 42; index += 1) {
    dates.push(addDays(gridStart, index));
  }

  return dates;
}
