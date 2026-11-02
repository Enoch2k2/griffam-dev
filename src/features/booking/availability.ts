import { Temporal } from "@js-temporal/polyfill";
export type Hours = { day: number; start: string; end: string };
export type Availability = { timeZone: string; hours: Hours[]; closedDates: string[] };
export type Settings = Availability & { version: number };
export const CALL_MINUTES = 30;
export const BUFFER_MINUTES = 30;
export const NOTICE_HOURS = 24;
export const initialSettings: Settings = {
  timeZone: "America/Chicago", hours: [1, 2, 3, 4, 5].map(day => ({ day, start: "09:00", end: "16:00" })), closedDates: [], version: 0,
};
const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function validateSettings(value: unknown): Settings | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Settings;
  if (!Number.isSafeInteger(v.version) || v.version < 0 || v.version > 1_000_000 || typeof v.timeZone !== "string" || v.timeZone.length > 100 || /^[+-]/.test(v.timeZone)) return null;
  try { new Intl.DateTimeFormat("en", { timeZone: v.timeZone }).format(); } catch { return null; }
  if (!Array.isArray(v.hours) || v.hours.length > 7 || !Array.isArray(v.closedDates) || v.closedDates.length > 366) return null;
  const seen = new Set<number>();
  for (const row of v.hours) {
    if (!row || !Number.isInteger(row.day) || row.day < 1 || row.day > 7 || seen.has(row.day) || typeof row.start !== "string" || typeof row.end !== "string" || !time.test(row.start) || !time.test(row.end) || row.start >= row.end) return null;
    seen.add(row.day);
  }
  for (const date of v.closedDates) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    try { Temporal.PlainDate.from(date); } catch { return null; }
  }
  return { version: v.version, timeZone: v.timeZone, hours: v.hours.map(({ day, start, end }) => ({ day, start, end })), closedDates: [...new Set(v.closedDates)].sort() };
}
export type Busy = { start: string; end: string };
export type Slot = { start: string; end: string; date: string };
// Owner preview only until a fresh Google busy response and local reservations are supplied.
export function candidateSlots(settings: Availability, now: string, days: number, busy: Busy[]): Slot[] {
  if (!validateSettings({ ...settings, version: 0 }) || !Number.isInteger(days) || days < 1 || days > 30) throw new Error("Invalid availability input.");
  const instant = Temporal.Instant.from(now);
  const earliest = instant.add({ hours: NOTICE_HOURS }).epochMilliseconds;
  const first = instant.toZonedDateTimeISO(settings.timeZone).toPlainDate();
  const blocked = busy.map(interval => {
    const start = Temporal.Instant.from(interval.start).epochMilliseconds;
    const end = Temporal.Instant.from(interval.end).epochMilliseconds;
    if (end <= start) throw new Error("Invalid busy interval.");
    return { start, end: end + BUFFER_MINUTES * 60_000 };
  });
  const slots: Slot[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = first.add({ days: offset });
    if (settings.closedDates.includes(date.toString())) continue;
    const hours = settings.hours.find(row => row.day === date.dayOfWeek);
    if (!hours) continue;
    const startMinute = Number(hours.start.slice(0, 2)) * 60 + Number(hours.start.slice(3));
    const endMinute = Number(hours.end.slice(0, 2)) * 60 + Number(hours.end.slice(3));
    for (let minute = startMinute; minute + CALL_MINUTES <= endMinute; minute += CALL_MINUTES) {
      try {
        const local = date.toPlainDateTime({ hour: Math.floor(minute / 60), minute: minute % 60 });
        // Skip nonexistent and ambiguous local times instead of silently shifting them.
        const start = local.toZonedDateTime(settings.timeZone, { disambiguation: "reject" }).toInstant();
        const endLocal = local.add({ minutes: CALL_MINUTES });
        const end = endLocal.toZonedDateTime(settings.timeZone, { disambiguation: "reject" }).toInstant();
        if (end.epochMilliseconds - start.epochMilliseconds !== CALL_MINUTES * 60_000 || start.epochMilliseconds < earliest) continue;
        const occupiedEnd = end.epochMilliseconds + BUFFER_MINUTES * 60_000;
        if (blocked.some(b => start.epochMilliseconds < b.end && occupiedEnd > b.start)) continue;
        slots.push({ start: start.toString(), end: end.toString(), date: date.toString() });
      } catch { /* DST gap or repeated local time: omit this candidate. */ }
    }
  }
  return slots;
}
