import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ config: vi.fn(), settings: vi.fn(), connection: vi.fn(), busy: vi.fn(), decrypt: vi.fn() }));
vi.mock("@/server/db", () => ({ getDatabase: () => ({}) }));
vi.mock("@/server/calendar/config", () => ({ calendarConfig: mocks.config }));
vi.mock("@/server/calendar/store", () => ({ readConnection: mocks.connection }));
vi.mock("@/server/calendar/crypto", () => ({ decrypt: mocks.decrypt }));
vi.mock("@/server/calendar/google", () => ({ readBusy: mocks.busy }));
vi.mock("./settings", () => ({ readSettings: mocks.settings }));
import { initialSettings } from "@/features/booking/availability";
import { publicAvailability } from "./public-availability";
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-30T14:00:00Z"));
  mocks.config.mockReturnValue({ key: "private" });
  mocks.settings.mockResolvedValue({ ...initialSettings, version: 1 });
  mocks.connection.mockResolvedValue({ encryptedRefreshToken: "ciphertext", accountEmail: "private@example.com" });
  mocks.decrypt.mockReturnValue("token"); mocks.busy.mockResolvedValue([]);
});
it("filters Google conflicts and returns only available times without private calendar data", async () => {
  mocks.busy.mockResolvedValue([{ start: "2026-11-02T15:00:00Z", end: "2026-11-02T16:00:00Z" }]);
  const response = await publicAvailability(); const body = await response.json();
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
  expect(body.days).toBe(30);
  expect(body.slots).not.toContainEqual({ start: "2026-11-02T15:00:00Z", end: "2026-11-02T15:30:00Z" });
  expect(body.slots).toContainEqual({ start: "2026-11-02T16:30:00Z", end: "2026-11-02T17:00:00Z" });
  expect(JSON.stringify(body)).not.toMatch(/token|ciphertext|private@example|busy/);
  // Local-day horizon spans the fall DST transition, with buffer padding.
  expect(mocks.busy.mock.calls[0].slice(2)).toEqual(["2026-10-30T04:30:00Z", "2026-11-29T06:30:00Z"]);
});
it("fails closed when Google fails, with no leaked reason or available slots", async () => {
  mocks.busy.mockRejectedValue(new Error("private token"));
  const response = await publicAvailability();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Call times are temporarily unavailable. Please try again or contact Enoch." });
});
it("does not expose unsaved default hours or query Google without a connection", async () => {
  mocks.settings.mockResolvedValue(initialSettings);
  expect((await publicAvailability()).status).toBe(503);
  mocks.settings.mockResolvedValue({ ...initialSettings, version: 1 });
  mocks.connection.mockResolvedValue(null);
  expect((await publicAvailability()).status).toBe(503);
  expect(mocks.busy).not.toHaveBeenCalled();
});
it("distinguishes a genuinely empty calendar window from an outage", async () => {
  mocks.settings.mockResolvedValue({ ...initialSettings, hours: [], version: 1 });
  const response = await publicAvailability();
  expect(response.status).toBe(200); expect((await response.json()).slots).toEqual([]);
});
