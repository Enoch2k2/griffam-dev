import { Temporal } from "@js-temporal/polyfill";

export type BookingSlot = { start: string; end: string };
export type SlotsByDate = Record<string, BookingSlot[]>;

export function dateKeyForInstant(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function groupSlotsByDate(slots: BookingSlot[], timeZone: string): SlotsByDate {
  const grouped: SlotsByDate = {};
  for (const slot of [...slots].sort((left, right) => Date.parse(left.start) - Date.parse(right.start))) {
    const key = dateKeyForInstant(slot.start, timeZone);
    (grouped[key] ??= []).push(slot);
  }
  return grouped;
}

export function monthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function shiftMonth(value: string, months: number) {
  return Temporal.PlainYearMonth.from(value).add({ months }).toString();
}

export function monthGrid(value: string) {
  const month = Temporal.PlainYearMonth.from(value);
  const first = month.toPlainDate({ day: 1 });
  const leading = first.dayOfWeek % 7;
  const cells: Array<number | null> = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: month.daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function dateKeyForDay(value: string, day: number) {
  return Temporal.PlainYearMonth.from(value).toPlainDate({ day }).toString();
}

export function fullDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-01T12:00:00Z`));
}
