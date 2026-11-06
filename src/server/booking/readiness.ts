import "server-only";
import type { Database } from "@/server/db/connection";
import { calendarConfig } from "@/server/calendar/config";
import { decrypt } from "@/server/calendar/crypto";
import { readConnection } from "@/server/calendar/store";
import { readEmailConfig } from "@/server/email/config";
import { readZoomConfig } from "@/server/zoom/meetings";
import { readSettings } from "./settings";

export async function readBookingRuntime(db: Database) {
  if (process.env.BOOKING_ENABLED !== "true" || process.env.CALENDAR_EVENTS_ENABLED !== "true") return null;
  const calendar = calendarConfig();
  const zoom = readZoomConfig();
  const email = readEmailConfig();
  if (!calendar || !zoom || !email) return null;
  const [connection, settings] = await Promise.all([readConnection(db), readSettings(db)]);
  if (!settings.version || !connection?.encryptedRefreshToken || !connection.eventWriteGranted) return null;
  let refreshToken: string;
  try { refreshToken = decrypt(connection.encryptedRefreshToken, calendar.key); }
  catch { return null; }
  return { calendar, zoom, email, refreshToken };
}
