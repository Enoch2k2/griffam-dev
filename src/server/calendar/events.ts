import "server-only";
import { createHash } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import type { CalendarConfig } from "./config";

type CalendarBooking = { id: string; start: string; end: string; joinUrl: string; name: string; email: string; notes: string; timeZone: string };
// Google Calendar descriptions support HTML; keep client-supplied text literal.
function escapeDescription(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function description(booking: CalendarBooking) {
  return [
    "Free 30-minute discovery call",
    `Client: ${booking.name}`,
    `Email: ${booking.email}`,
    `Client time zone: ${booking.timeZone}`,
    "",
    "Project notes:",
    booking.notes.trim() || "No project notes provided.",
    "",
    `Join Zoom: ${booking.joinUrl}`,
    `Booking reference: ${booking.id}`,
  ].map(escapeDescription).join("\n");
}
function failure() { return new Error("Calendar event could not be verified"); }
export function calendarEventId(bookingId: string) {
  return `gd${createHash("sha256").update(bookingId).digest("hex")}`;
}
function verify(data: unknown, booking: CalendarBooking) {
  const event = data as { id?: unknown; status?: unknown; transparency?: unknown; start?: { dateTime?: string }; end?: { dateTime?: string }; location?: unknown; extendedProperties?: { private?: { griffamBooking?: unknown } } };
  if (!event || event.id !== calendarEventId(booking.id) || event.status !== "confirmed" || event.transparency === "transparent" || event.extendedProperties?.private?.griffamBooking !== booking.id || event.location !== booking.joinUrl || Date.parse(event.start?.dateTime ?? "") !== Date.parse(booking.start) || Date.parse(event.end?.dateTime ?? "") !== Date.parse(booking.end)) throw failure();
  return { id: calendarEventId(booking.id) };
}
function status(error: unknown) { return (error as { response?: { status?: number } })?.response?.status; }
export async function ensureCalendarEvent(config: CalendarConfig, refreshToken: string, booking: CalendarBooking) {
  try {
    if (process.env.CALENDAR_EVENTS_ENABLED !== "true" || !/^[a-zA-Z0-9-]{1,100}$/.test(booking.id) || Date.parse(booking.end) - Date.parse(booking.start) !== 30 * 60_000) throw failure();
    const join = new URL(booking.joinUrl);
    if (join.protocol !== "https:" || join.username || join.password || join.port || join.hash || !(join.hostname === "zoom.us" || join.hostname.endsWith(".zoom.us")) || !/^\/j\/\d{9,15}$/.test(join.pathname) || [...join.searchParams.keys()].some(key => key !== "pwd")) throw failure();
    const oauth = new OAuth2Client({ clientId: config.googleClientId, clientSecret: config.googleClientSecret, transporterOptions: { timeout: 10_000, retry: false } });
    oauth.setCredentials({ refresh_token: refreshToken });
    const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const id = calendarEventId(booking.id);
    const get = async () => verify((await oauth.request({ url: `${base}/${id}`, method: "GET", timeout: 10_000, retry: false })).data, booking);
    try { return await get(); } catch (error) { if (status(error) !== 404) throw error; }
    try {
      const response = await oauth.request({ url: base, method: "POST", params: { sendUpdates: "all" }, timeout: 10_000, retry: false, data: {
        id, summary: `Discovery call with ${booking.name.replace(/\s+/g, " ").trim()} — GriffamDev`, description: description(booking), visibility: "private", transparency: "opaque", location: booking.joinUrl,
        attendees: [{ email: booking.email }],
        start: { dateTime: booking.start }, end: { dateTime: booking.end },
        extendedProperties: { private: { griffamBooking: booking.id } }, reminders: { useDefault: false },
      } });
      return verify(response.data, booking);
    } catch {
      // Both a duplicate ID and a lost POST response are resolved by a read, never another insert.
      return await get();
    }
  } catch { throw failure(); }
}

// Only cancel an event carrying this application's private booking marker. A
// missing or already-cancelled event is an idempotent success.
export async function cancelCalendarEvent(config: CalendarConfig, refreshToken: string, eventId: string, bookingId: string) {
  try {
    if (process.env.CALENDAR_EVENTS_ENABLED !== "true" || !/^[a-zA-Z0-9-]{1,100}$/.test(bookingId) || eventId !== calendarEventId(bookingId)) throw failure();
    const oauth = new OAuth2Client({ clientId: config.googleClientId, clientSecret: config.googleClientSecret, transporterOptions: { timeout: 10_000, retry: false } });
    oauth.setCredentials({ refresh_token: refreshToken });
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    let response;
    try { response = await oauth.request({ url, method: "GET", timeout: 10_000, retry: false }); }
    catch (error) { if (status(error) === 404) return; throw error; }
    const event = response.data as { id?: unknown; status?: unknown; extendedProperties?: { private?: { griffamBooking?: unknown } } };
    if (event.id !== eventId || event.extendedProperties?.private?.griffamBooking !== bookingId) throw failure();
    if (event.status === "cancelled") return;
    await oauth.request({ url, method: "PATCH", params: { sendUpdates: "all" }, timeout: 10_000, retry: false, data: { status: "cancelled" } });
    const verifyResponse = await oauth.request({ url, method: "GET", timeout: 10_000, retry: false });
    const verified = verifyResponse.data as { id?: unknown; status?: unknown; extendedProperties?: { private?: { griffamBooking?: unknown } } };
    if (verified.id !== eventId || verified.status !== "cancelled" || verified.extendedProperties?.private?.griffamBooking !== bookingId) throw failure();
  } catch { throw failure(); }
}
