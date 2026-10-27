import { expect, it } from "vitest";
import { candidateSlots, initialSettings, validateSettings } from "./availability";
it("uses confirmed weekday hours and excludes weekends", () => {
  const slots = candidateSlots(initialSettings, "2026-10-23T00:00:00Z", 7, []);
  expect(slots.some(s => s.date === "2026-10-24" || s.date === "2026-10-25")).toBe(false);
  const monday = slots.filter(s => s.date === "2026-10-26");
  expect(monday).toHaveLength(14);
  expect(monday[0].start).toBe("2026-10-26T14:00:00Z");
  expect(monday.at(-1)?.end).toBe("2026-10-26T21:00:00Z");
});
it("enforces exactly 24 hours notice and date exceptions", () => {
  const slots = candidateSlots(initialSettings, "2026-10-26T14:00:01Z", 3, []);
  expect(slots[0].start).toBe("2026-10-27T14:30:00Z");
  expect(candidateSlots({ ...initialSettings, closedDates: ["2026-10-27"] }, "2026-10-26T14:00:00Z", 2, [])).toEqual([]);
});
it("keeps 30 minute gaps before and after busy events, accepting exact boundaries", () => {
  const slots = candidateSlots(initialSettings, "2026-10-25T00:00:00Z", 3, [{ start: "2026-10-26T15:00:00Z", end: "2026-10-26T15:30:00Z" }]);
  const starts = slots.map(s => s.start);
  expect(starts).toContain("2026-10-26T14:00:00Z");
  expect(starts).not.toContain("2026-10-26T14:30:00Z");
  expect(starts).not.toContain("2026-10-26T15:30:00Z");
  expect(starts).toContain("2026-10-26T16:00:00Z");
});
it("keeps local working hours stable across daylight saving changes", () => {
  const slots = candidateSlots(initialSettings, "2026-10-29T00:00:00Z", 7, []);
  expect(slots.find(s => s.date === "2026-10-30")?.start).toBe("2026-10-30T14:00:00Z");
  expect(slots.find(s => s.date === "2026-11-02")?.start).toBe("2026-11-02T15:00:00Z");
});
it("omits nonexistent and ambiguous local times on transition days", () => {
  const sunday = { ...initialSettings, hours: [{ day: 7, start: "01:00", end: "04:00" }] };
  const spring = candidateSlots(sunday, "2026-03-06T00:00:00Z", 4, []).filter(s => s.date === "2026-03-08");
  expect(spring.map(s => s.start)).toEqual(["2026-03-08T07:00:00Z", "2026-03-08T08:00:00Z", "2026-03-08T08:30:00Z"]);
  const fall = candidateSlots(sunday, "2026-10-30T00:00:00Z", 4, []).filter(s => s.date === "2026-11-01");
  expect(fall[0].start).toBe("2026-11-01T08:00:00Z");
});
it("rejects malformed settings and busy responses rather than opening slots", () => {
  expect(validateSettings({ ...initialSettings, timeZone: "made/up" })).toBeNull();
  expect(validateSettings({ ...initialSettings, hours: [{ day: 1, start: "16:00", end: "09:00" }] })).toBeNull();
  expect(validateSettings({ ...initialSettings, hours: [...initialSettings.hours, initialSettings.hours[0]] })).toBeNull();
  expect(validateSettings({ ...initialSettings, closedDates: ["2026-02-30"] })).toBeNull();
  expect(() => candidateSlots(initialSettings, "2026-10-26T00:00:00Z", 7, [{ start: "bad", end: "bad" }])).toThrow();
  expect(() => candidateSlots(initialSettings, "2026-10-26T00:00:00Z", 31, [])).toThrow();
});
