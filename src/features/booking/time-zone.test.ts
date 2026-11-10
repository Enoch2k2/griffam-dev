import { expect, it } from "vitest";
import { formatBookingDateTime, toBookingWallTime } from "./time-zone";

it("formats a booking in Central Standard Time during winter", () => {
  expect(formatBookingDateTime("2026-11-09T15:00:00Z")).toBe("Monday, November 9, 2026, 9:00 AM CST");
  expect(toBookingWallTime("2026-11-09T15:00:00Z")).toBe("2026-11-09T09:00:00");
});

it("formats a booking in Central Daylight Time during summer", () => {
  expect(formatBookingDateTime("2026-07-01T15:00:00Z")).toBe("Wednesday, July 1, 2026, 10:00 AM CDT");
  expect(toBookingWallTime("2026-07-01T15:00:00Z")).toBe("2026-07-01T10:00:00");
});
