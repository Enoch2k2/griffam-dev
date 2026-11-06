import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ calendar: vi.fn(), zoom: vi.fn(), email: vi.fn(), connection: vi.fn(), settings: vi.fn(), decrypt: vi.fn() }));
vi.mock("@/server/calendar/config", () => ({ calendarConfig: mocks.calendar }));
vi.mock("@/server/calendar/crypto", () => ({ decrypt: mocks.decrypt }));
vi.mock("@/server/calendar/store", () => ({ readConnection: mocks.connection }));
vi.mock("@/server/email/config", () => ({ readEmailConfig: mocks.email }));
vi.mock("@/server/zoom/meetings", () => ({ readZoomConfig: mocks.zoom }));
vi.mock("./settings", () => ({ readSettings: mocks.settings }));
import { readBookingRuntime } from "./readiness";
beforeEach(() => {
  vi.stubEnv("BOOKING_ENABLED", "true"); vi.stubEnv("CALENDAR_EVENTS_ENABLED", "true");
  mocks.calendar.mockReturnValue({ key: Buffer.alloc(32) }); mocks.zoom.mockReturnValue({}); mocks.email.mockReturnValue({});
  mocks.connection.mockResolvedValue({ encryptedRefreshToken: "encrypted", eventWriteGranted: true });
  mocks.settings.mockResolvedValue({ version: 1 }); mocks.decrypt.mockReturnValue("refresh");
});
it("requires every explicit flag, provider config, saved schedule and event-write consent", async () => {
  expect(await readBookingRuntime({} as never)).toMatchObject({ refreshToken: "refresh" });
  vi.stubEnv("BOOKING_ENABLED", "false"); expect(await readBookingRuntime({} as never)).toBeNull();
  vi.stubEnv("BOOKING_ENABLED", "true"); mocks.connection.mockResolvedValue({ encryptedRefreshToken: "encrypted", eventWriteGranted: false });
  expect(await readBookingRuntime({} as never)).toBeNull();
  mocks.connection.mockResolvedValue({ encryptedRefreshToken: "encrypted", eventWriteGranted: true }); mocks.settings.mockResolvedValue({ version: 0 });
  expect(await readBookingRuntime({} as never)).toBeNull();
  mocks.settings.mockResolvedValue({ version: 1 }); mocks.zoom.mockReturnValue(null);
  expect(await readBookingRuntime({} as never)).toBeNull();
});
it("fails closed when the saved refresh token cannot be decrypted", async () => {
  mocks.decrypt.mockImplementation(() => { throw new Error("secret"); });
  expect(await readBookingRuntime({} as never)).toBeNull();
});
