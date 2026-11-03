import "server-only";
const messages = {
  api_disabled: "Google Calendar API is disabled for the OAuth client’s project. Enable it in Google Cloud → APIs & Services → Library, wait a few minutes, then test again.",
  reconnect: "Google rejected the saved Calendar authorization. Click Reconnect Google Calendar and grant busy-time access. Testing-mode grants can expire.",
  oauth_client: "Google rejected the OAuth client configuration. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Render against the Google Cloud Web client.",
  permission: "Google denied Calendar access. Reconnect and grant busy-time access; if it still fails, check your Google Workspace app-access policy.",
  credential: "The saved Calendar credential could not be opened. Check that CALENDAR_TOKEN_KEY has not changed, or reconnect using the current key.",
  calendar_unavailable: "Google could not return busy times for the requested calendar. Check that your owner Google account has an active primary calendar, then reconnect.",
  invalid_response: "Google returned an unexpected Calendar response. Availability could not be verified. Please report this error code: invalid_response.",
  temporary: "Google Calendar is temporarily unavailable or rate limited. Wait a moment and test again.",
  unknown: "Calendar access could not be verified. Check Google Calendar API setup, or reconnect and grant the requested permission.",
} as const;
export class CalendarError extends Error {
  constructor(public readonly code: keyof typeof messages) { super(messages[code]); }
}
function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}
// Inspect only structured provider codes. Never forward messages, request headers,
// token responses, URLs or raw error objects to the browser or logs.
export function providerError(error: unknown): CalendarError {
  if (error instanceof CalendarError) return error;
  const outer = object(error), response = object(outer.response), data = object(response.data);
  const payload = object(data.error);
  const reasons = [
    ...(Array.isArray(payload.errors) ? payload.errors.map(item => object(item).reason) : []),
    ...(Array.isArray(payload.details) ? payload.details.map(item => object(item).reason) : []),
  ];
  if (reasons.includes("accessNotConfigured") || reasons.includes("SERVICE_DISABLED")) return new CalendarError("api_disabled");
  if (data.error === "invalid_grant") return new CalendarError("reconnect");
  if (data.error === "invalid_client" || data.error === "unauthorized_client") return new CalendarError("oauth_client");
  if (response.status === 401) return new CalendarError("reconnect");
  if (response.status === 429 || (typeof response.status === "number" && response.status >= 500) || ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND"].includes(String(outer.code)) || reasons.some(reason => ["rateLimitExceeded", "userRateLimitExceeded"].includes(String(reason)))) return new CalendarError("temporary");
  if (response.status === 403) return new CalendarError("permission");
  return new CalendarError("unknown");
}
export function safeCalendarFailure(error: unknown) {
  const safe = providerError(error);
  return { error: safe.message, code: safe.code };
}
