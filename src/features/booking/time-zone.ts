export const BOOKING_TIME_ZONE = "America/Chicago";

export function formatBookingTime(instant: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant instanceof Date ? instant : new Date(instant));
}

export function formatBookingDate(instant: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_TIME_ZONE,
    dateStyle: "full",
  }).format(instant instanceof Date ? instant : new Date(instant));
}

export function formatBookingDateTime(instant: Date | string) {
  return `${formatBookingDate(instant)}, ${formatBookingTime(instant)}`;
}

export function formatBookingRange(start: Date | string, end: Date | string) {
  return `${formatBookingDate(start)} · ${formatBookingTime(start)} – ${formatBookingTime(end)}`;
}

export function toBookingWallTime(instant: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}
