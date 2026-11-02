import "server-only";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import type { CalendarConfig } from "./config";
import { CalendarError, providerError } from "./errors";
export const busyScope = "https://www.googleapis.com/auth/calendar.freebusy";
function client(config: CalendarConfig) {
  return new OAuth2Client({ clientId: config.googleClientId, clientSecret: config.googleClientSecret, redirectUri: config.callback,
    transporterOptions: { timeout: 10_000, retry: false } });
}
export async function consentUrl(config: CalendarConfig, state: string) {
  const oauth = client(config);
  const pkce = await oauth.generateCodeVerifierAsync();
  const url = oauth.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: ["openid", "email", busyScope], state,
    login_hint: config.ownerEmail, code_challenge: pkce.codeChallenge, code_challenge_method: CodeChallengeMethod.S256 });
  return { url, verifier: pkce.codeVerifier };
}
export async function exchangeCode(config: CalendarConfig, code: string, verifier: string) {
  const oauth = client(config);
  const { tokens } = await oauth.getToken({ code, codeVerifier: verifier });
  if (!tokens.id_token || !tokens.refresh_token || !tokens.scope?.split(" ").includes(busyScope)) throw new Error("Incomplete calendar consent");
  const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: config.googleClientId });
  const identity = ticket.getPayload();
  if (!identity?.email_verified || identity.email?.toLowerCase() !== config.ownerEmail) throw new Error("Wrong calendar account");
  return { refreshToken: tokens.refresh_token, email: identity.email };
}
export function parseBusy(value: unknown): { start: string; end: string }[] {
  const response = value as { calendars?: { primary?: { errors?: unknown[]; busy?: unknown[] } } };
  const calendar = response?.calendars?.primary;
  if (calendar?.errors?.length) throw new CalendarError("calendar_unavailable");
  if (!calendar || !Array.isArray(calendar.busy)) throw new CalendarError("invalid_response");
  return calendar.busy.map(value => {
    const item = value as { start?: unknown; end?: unknown };
    if (typeof item?.start !== "string" || typeof item.end !== "string" || !Number.isFinite(Date.parse(item.start)) || !Number.isFinite(Date.parse(item.end)) || Date.parse(item.start) >= Date.parse(item.end)) throw new CalendarError("invalid_response");
    return { start: item.start, end: item.end };
  });
}
export async function readBusy(config: CalendarConfig, refreshToken: string, start: string, end: string) {
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start) || Date.parse(end) - Date.parse(start) > 32 * 86400000) throw new Error("Invalid calendar range");
  const oauth = client(config);
  oauth.setCredentials({ refresh_token: refreshToken });
  try {
  const response = await oauth.request({ url: "https://www.googleapis.com/calendar/v3/freeBusy", method: "POST", data: { timeMin: start, timeMax: end, items: [{ id: "primary" }] }, timeout: 10_000, retry: false });
  return parseBusy(response.data);
  } catch (error) { throw providerError(error); }
}
