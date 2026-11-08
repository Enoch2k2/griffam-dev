import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn(), setCredentials: vi.fn() }));
vi.mock("google-auth-library", () => ({ OAuth2Client: class { request = mocks.request; setCredentials = mocks.setCredentials; } }));
import { calendarEventId, ensureCalendarEvent } from "./events";
import type { CalendarConfig } from "./config";
const config = { googleClientId: "client", googleClientSecret: "secret" } as CalendarConfig;
const booking = { id: "booking-1", start: "2026-12-01T15:00:00Z", end: "2026-12-01T15:30:00Z", joinUrl: "https://zoom.us/j/12345678901?pwd=participant", name: "Alex Client", email: "alex@example.com", notes: "Build a portfolio.\nDiscuss the launch timeline.", timeZone: "America/Chicago" };
const event = { id: calendarEventId(booking.id), status: "confirmed", start: { dateTime: booking.start }, end: { dateTime: booking.end }, location: booking.joinUrl, extendedProperties: { private: { griffamBooking: booking.id } } };
beforeEach(() => { mocks.request.mockReset(); vi.stubEnv("CALENDAR_EVENTS_ENABLED", "true"); });
afterEach(() => vi.unstubAllEnvs());
it("inserts one private deterministic event and emails the calendar invitation to the client", async () => {
  mocks.request.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: event });
  await expect(ensureCalendarEvent(config, "refresh", booking)).resolves.toEqual({ id: event.id });
  expect(event.id).toMatch(/^[0-9a-v]{5,1024}$/);
  expect(mocks.request.mock.calls[1][0]).toMatchObject({ method: "POST", retry: false, params: { sendUpdates: "all" }, data: { id: event.id, visibility: "private", transparency: "opaque", attendees: [{ email: booking.email }] } });
  expect(mocks.request.mock.calls[1][0].data).toMatchObject({
    summary: "Discovery call with Alex Client — GriffamDev",
    description: `Free 30-minute discovery call\nClient: Alex Client\nEmail: alex@example.com\nClient time zone: America/Chicago\n\nProject notes:\nBuild a portfolio.\nDiscuss the launch timeline.\n\nJoin Zoom: ${booking.joinUrl}\nBooking reference: booking-1`,
  });
});
it("escapes client markup, preserves note lines, and keeps the title on one line", async () => {
  mocks.request.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: event });
  await ensureCalendarEvent(config, "refresh", { ...booking, name: "Alex\nClient", notes: '<a href="https://example.com">Click & go</a>\nNext line' });
  const data = mocks.request.mock.calls[1][0].data;
  expect(data.summary).toBe("Discovery call with Alex Client — GriffamDev");
  expect(data.description).toContain('&lt;a href=&quot;https://example.com&quot;&gt;Click &amp; go&lt;/a&gt;\nNext line');
  expect(data.description).not.toContain("<a");
});
it("provides a useful description when project notes are empty", async () => {
  mocks.request.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: event });
  await ensureCalendarEvent(config, "refresh", { ...booking, notes: "  " });
  expect(mocks.request.mock.calls[1][0].data.description).toContain("No project notes provided.");
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
