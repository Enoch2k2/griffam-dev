import { expect, it } from "vitest";
import { CalendarError, safeCalendarFailure } from "./errors";
it.each([
  [{ response: { status: 403, data: { error: { errors: [{ reason: "accessNotConfigured" }] } } } }, "api_disabled"],
  [{ response: { status: 403, data: { error: { details: [{ reason: "SERVICE_DISABLED" }] } } } }, "api_disabled"],
  [{ response: { status: 400, data: { error: "invalid_grant" } } }, "reconnect"],
  [{ response: { status: 401, data: { error: "invalid_client" } } }, "oauth_client"],
  [{ response: { status: 401 } }, "reconnect"],
  [{ response: { status: 403 } }, "permission"],
  [{ response: { status: 503 } }, "temporary"],
  [{ response: { status: 429 } }, "temporary"],
  [{ code: "ETIMEDOUT" }, "temporary"],
  [{ response: { status: 403, data: { error: { errors: [{ reason: "rateLimitExceeded" }] } } } }, "temporary"],
  [null, "unknown"],
  [new CalendarError("credential"), "credential"],
])("classifies structured provider failures safely", (error, code) => {
  expect(safeCalendarFailure(error).code).toBe(code);
});
it("does not expose untrusted provider messages or credentials", () => {
  const error = { message: "secret-token", config: { headers: { Authorization: "secret-token" } }, response: { status: 400, data: { error: "secret-token", error_description: "secret-token" } } };
  expect(JSON.stringify(safeCalendarFailure(error))).not.toContain("secret-token");
  expect(safeCalendarFailure(error).code).toBe("unknown");
});
it("preserves the recognized provider reason and distinguishes refresh from free/busy", () => {
  const base = { response: { status: 403, data: { error: { details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] } } } };
  expect(safeCalendarFailure({ ...base, config: { url: "https://www.googleapis.com/calendar/v3/freeBusy?secret=hidden" } })).toMatchObject({ diagnostic: "freebusy/403/ACCESS_TOKEN_SCOPE_INSUFFICIENT" });
  expect(safeCalendarFailure({ config: { url: "https://oauth2.googleapis.com/token" }, response: { status: 400, data: { error: "invalid_grant" } } })).toMatchObject({ diagnostic: "token-refresh/400/invalid_grant", code: "reconnect" });
});
it("does not emit arbitrary provider reasons, URLs, statuses or messages", () => {
  const result = safeCalendarFailure({ config: { url: "https://secret.example/private" }, response: { status: "secret", data: { error: { message: "secret", errors: [{ reason: "secret" }] } } } });
  expect(result.diagnostic).toBe("provider/unknown/unrecognized");
  expect(JSON.stringify(result)).not.toContain("secret");
});
