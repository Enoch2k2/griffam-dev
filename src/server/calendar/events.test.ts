import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn(), setCredentials: vi.fn() }));
vi.mock("google-auth-library", () => ({ OAuth2Client: class { request = mocks.request; setCredentials = mocks.setCredentials; } }));
import { calendarEventId, ensureCalendarEvent } from "./events";
import type { CalendarConfig } from "./config";
const config = { googleClientId: "client", googleClientSecret: "secret" } as CalendarConfig;
const booking = { id: "booking-1", start: "2026-12-01T15:00:00Z", end: "2026-12-01T15:30:00Z", joinUrl: "https://zoom.us/j/12345678901?pwd=participant" };
const event = { id: calendarEventId(booking.id), status: "confirmed", start: { dateTime: booking.start }, end: { dateTime: booking.end }, location: booking.joinUrl, extendedProperties: { private: { griffamBooking: booking.id } } };
beforeEach(() => { mocks.request.mockReset(); vi.stubEnv("CALENDAR_EVENTS_ENABLED", "true"); });
afterEach(() => vi.unstubAllEnvs());
it("inserts one private deterministic event without attendees or invitation emails", async () => {
  mocks.request.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: event });
  await expect(ensureCalendarEvent(config, "refresh", booking)).resolves.toEqual({ id: event.id });
  expect(event.id).toMatch(/^[0-9a-v]{5,1024}$/);
  expect(mocks.request.mock.calls[1][0]).toMatchObject({ method: "POST", retry: false, params: { sendUpdates: "none" }, data: { id: event.id, visibility: "private", transparency: "opaque" } });
  expect(mocks.request.mock.calls[1][0].data).not.toHaveProperty("attendees");
});
it("returns an existing matching event without writing", async () => {
  mocks.request.mockResolvedValueOnce({ data: event });
  await expect(ensureCalendarEvent(config, "refresh", booking)).resolves.toEqual({ id: event.id });
  expect(mocks.request).toHaveBeenCalledTimes(1);
});
it("resolves an ambiguous insert with a read rather than a duplicate insert", async () => {
  for (const error of [{ response: { status: 409 } }, new Error("timeout")]) {
    mocks.request.mockReset().mockRejectedValueOnce({ response: { status: 404 } }).mockRejectedValueOnce(error).mockResolvedValueOnce({ data: event });
    await expect(ensureCalendarEvent(config, "refresh", booking)).resolves.toEqual({ id: event.id });
    expect(mocks.request.mock.calls.map(([request]) => request.method)).toEqual(["GET", "POST", "GET"]);
  }
});
it("refuses mismatched or cancelled existing events and does not overwrite them", async () => {
  for (const change of [{ status: "cancelled" }, { transparency: "transparent" }, { location: "https://zoom.us/j/12345678901?unexpected=true" }, { extendedProperties: {} }, { start: { dateTime: "2026-12-02T15:00:00Z" } }]) {
    mocks.request.mockReset().mockResolvedValueOnce({ data: { ...event, ...change } });
    await expect(ensureCalendarEvent(config, "refresh", booking)).rejects.toThrow("Calendar event could not be verified");
    expect(mocks.request).toHaveBeenCalledTimes(1);
  }
});
it("fails closed when disabled, unauthorized or unable to recover", async () => {
  vi.stubEnv("CALENDAR_EVENTS_ENABLED", "false");
  await expect(ensureCalendarEvent(config, "refresh", booking)).rejects.toThrow();
  expect(mocks.request).not.toHaveBeenCalled();
  vi.stubEnv("CALENDAR_EVENTS_ENABLED", "true");
  mocks.request.mockRejectedValueOnce({ response: { status: 403 } });
  await expect(ensureCalendarEvent(config, "refresh", booking)).rejects.toThrow("Calendar event could not be verified");
  expect(mocks.request).toHaveBeenCalledTimes(1);
});
