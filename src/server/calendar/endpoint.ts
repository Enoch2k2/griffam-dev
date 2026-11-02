import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { calendarConfig } from "./config";
import { CalendarError, safeCalendarFailure } from "./errors";
import { decrypt, digest, encrypt } from "./crypto";
import { consentUrl, exchangeCode, readBusy } from "./google";
import { beginConsent, claimConsent, disconnectCalendar, finishConsent, readConnection } from "./store";
const cookieName = "griffamdev-calendar-state";
function reply(body: object, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
function bounce(baseURL: string, result: string) {
  const response = NextResponse.redirect(`${baseURL}/admin/calendar?result=${result}`, 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(cookieName, "", { path: "/api/admin/calendar/callback", maxAge: 0, httpOnly: true, sameSite: "lax", secure: baseURL.startsWith("https:") });
  return response;
}
export async function startCalendar(request: Request) {
  try {
    const access = await getAdminAccess(request.headers);
    if (access.status !== "authorized") return reply({ error: "Owner access is required." }, 403);
    const config = calendarConfig();
    if (!config) return reply({ error: "Calendar setup is incomplete." }, 503);
    if (request.headers.get("origin") !== config.baseURL) return reply({ error: "Invalid request origin." }, 403);
    const state = randomBytes(32).toString("base64url");
    const consent = await consentUrl(config, state);
    await beginConsent(getDatabase(), access.user.id, digest(state), encrypt(consent.verifier, config.key));
    const response = NextResponse.redirect(consent.url, 303);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(cookieName, state, { path: "/api/admin/calendar/callback", httpOnly: true, sameSite: "lax", secure: config.baseURL.startsWith("https:"), maxAge: 600 });
    return response;
  } catch { return reply({ error: "Could not start Calendar connection. Try again." }, 503); }
}
export async function calendarCallback(request: NextRequest) {
  const config = calendarConfig();
  if (!config) return reply({ error: "Calendar setup is incomplete." }, 503);
  try {
    const access = await getAdminAccess(request.headers);
    if (access.status !== "authorized") return bounce(config.baseURL, "failed");
    const state = request.nextUrl.searchParams.get("state") ?? "";
    const saved = request.cookies.get(cookieName)?.value ?? "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(state) || saved.length !== state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(saved))) return bounce(config.baseURL, "failed");
    const db = getDatabase();
    const pending = await claimConsent(db, access.user.id, digest(state));
    if (!pending?.encryptedVerifier) return bounce(config.baseURL, "failed");
    if (request.nextUrl.searchParams.has("error")) return bounce(config.baseURL, "cancelled");
    const code = request.nextUrl.searchParams.get("code");
    if (!code || code.length > 4096) return bounce(config.baseURL, "failed");
    const tokens = await exchangeCode(config, code, decrypt(pending.encryptedVerifier, config.key));
    const savedConnection = await finishConsent(db, pending.revision, digest(state), encrypt(tokens.refreshToken, config.key), tokens.email);
    return bounce(config.baseURL, savedConnection ? "connected" : "failed");
  } catch { return bounce(config.baseURL, "failed"); }
}
export async function removeCalendar(request: Request) {
  try {
    if ((await getAdminAccess(request.headers)).status !== "authorized") return reply({ error: "Owner access is required." }, 403);
    // Allow local removal even when the encryption key/provider configuration is broken.
    const base = process.env.BETTER_AUTH_URL;
    if (!base || request.headers.get("origin") !== new URL(base).origin) return reply({ error: "Invalid request origin." }, 403);
    await disconnectCalendar(getDatabase());
    return bounce(new URL(base).origin, "disconnected");
  } catch { return reply({ error: "Disconnect could not be confirmed. Try again." }, 503); }
}
export async function testCalendar(request: Request) {
  try {
    if ((await getAdminAccess(request.headers)).status !== "authorized") return reply({ error: "Owner access is required." }, 403);
    const config = calendarConfig();
    if (!config) return reply({ error: "Calendar setup is incomplete." }, 503);
    if (request.headers.get("origin") !== config.baseURL) return reply({ error: "Invalid request origin." }, 403);
    const connection = await readConnection(getDatabase());
    if (!connection?.encryptedRefreshToken) return reply({ error: "Connect your calendar first." }, 409);
    let refreshToken: string;
    try { refreshToken = decrypt(connection.encryptedRefreshToken, config.key); }
    catch { throw new CalendarError("credential"); }
    const now = Date.now();
    const busy = await readBusy(config, refreshToken, new Date(now).toISOString(), new Date(now + 7 * 86400000).toISOString());
    return reply({ message: `Calendar access works. ${busy.length} busy interval(s) found in the next seven days. No appointments were created.` });
  } catch (error) { return reply(safeCalendarFailure(error), 503); }
}
