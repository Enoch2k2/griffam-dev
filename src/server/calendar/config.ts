import "server-only";
import { readAuthConfig } from "@/server/auth/config";
export function calendarConfig() {
  const auth = readAuthConfig();
  const key = process.env.CALENDAR_TOKEN_KEY;
  if (process.env.CALENDAR_ENABLED !== "true" || !auth || !key || !/^[a-fA-F0-9]{64}$/.test(key)) return null;
  return { ...auth, key: Buffer.from(key, "hex"), callback: `${auth.baseURL}/api/admin/calendar/callback` };
}
export type CalendarConfig = NonNullable<ReturnType<typeof calendarConfig>>;
