import "server-only";
import { Temporal } from "@js-temporal/polyfill";
import { BUFFER_MINUTES, candidateSlots } from "@/features/booking/availability";
import { getDatabase } from "@/server/db";
import { calendarConfig } from "@/server/calendar/config";
import { decrypt } from "@/server/calendar/crypto";
import { readBusy } from "@/server/calendar/google";
import { readConnection } from "@/server/calendar/store";
import { readSettings } from "./settings";

export const BROWSE_DAYS = 30;
const unavailable = "Call times are temporarily unavailable. Please try again or contact Enoch.";
// Read-only availability: no reservations or Calendar event writes in this slice.
export async function publicAvailability() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const config = calendarConfig();
    if (!config) throw new Error("Calendar not configured");
    const db = getDatabase();
    const [settings, connection] = await Promise.all([readSettings(db), readConnection(db)]);
    if (!settings.version || !connection?.encryptedRefreshToken) throw new Error("Availability not published");
    const now = Temporal.Now.instant();
    const first = now.toZonedDateTimeISO(settings.timeZone).startOfDay();
    // Include prior busy intervals whose after-call buffer reaches the first day,
    // and conflicts with the final day's after-call buffer, including DST changes.
    const start = first.toInstant().subtract({ minutes: BUFFER_MINUTES }).toString();
    const end = first.add({ days: BROWSE_DAYS }).toInstant().add({ minutes: BUFFER_MINUTES }).toString();
    const busy = await readBusy(config, decrypt(connection.encryptedRefreshToken, config.key), start, end);
    const slots = candidateSlots(settings, now.toString(), BROWSE_DAYS, busy)
      .map(({ start, end }) => ({ start, end }));
    return Response.json({ slots, checkedAt: now.toString(), days: BROWSE_DAYS }, { headers });
  } catch {
    // Public responses must not expose owner identity, credentials or busy periods.
    return Response.json({ error: unavailable }, { status: 503, headers });
  }
}
