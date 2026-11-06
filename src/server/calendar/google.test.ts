import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getToken: vi.fn(), verifyIdToken: vi.fn(), request: vi.fn(), setCredentials: vi.fn(), generateCodeVerifierAsync: vi.fn(), generateAuthUrl: vi.fn() }));
vi.mock("google-auth-library", () => ({ CodeChallengeMethod: { S256: "S256" }, OAuth2Client: class {
  generateCodeVerifierAsync = mocks.generateCodeVerifierAsync; generateAuthUrl = mocks.generateAuthUrl;
  getToken = mocks.getToken; verifyIdToken = mocks.verifyIdToken; request = mocks.request; setCredentials = mocks.setCredentials;
} }));
import { busyScope, eventScope, consentUrl, exchangeCode, parseBusy, readBusy } from "./google";
import type { CalendarConfig } from "./config";
const config = { googleClientId: "client", ownerEmail: "owner@example.com" } as CalendarConfig;
it("accepts a verified owner only with refresh token and free/busy scope", async () => {
  mocks.getToken.mockResolvedValue({ tokens: { id_token: "id", refresh_token: "refresh", scope: busyScope } });
  mocks.verifyIdToken.mockResolvedValue({ getPayload: () => ({ email: "owner@example.com", email_verified: true }) });
  expect(await exchangeCode(config, "code", "verifier")).toEqual({ email: "owner@example.com", refreshToken: "refresh", eventWriteGranted: false });
  expect(mocks.verifyIdToken).toHaveBeenCalledWith({ idToken: "id", audience: "client" });
  mocks.verifyIdToken.mockResolvedValue({ getPayload: () => ({ email: "other@example.com", email_verified: true }) });
  await expect(exchangeCode(config, "code", "verifier")).rejects.toThrow();
  mocks.verifyIdToken.mockResolvedValue({ getPayload: () => ({ email: "owner@example.com", email_verified: false }) });
  await expect(exchangeCode(config, "code", "verifier")).rejects.toThrow();
  mocks.getToken.mockResolvedValue({ tokens: { id_token: "id", refresh_token: "refresh", scope: "openid email" } });
  await expect(exchangeCode(config, "code", "verifier")).rejects.toThrow();
  mocks.getToken.mockResolvedValue({ tokens: { id_token: "id", scope: busyScope } });
  await expect(exchangeCode(config, "code", "verifier")).rejects.toThrow();
});
it("rejects missing calendars, partial errors and malformed busy intervals", () => {
  for (const data of [null, {}, { calendars: {} }, { calendars: { primary: { errors: [{ reason: "forbidden" }], busy: [] } } }, { calendars: { primary: { busy: [{ start: "bad", end: "bad" }] } } }]) expect(() => parseBusy(data)).toThrow();
  expect(parseBusy({ calendars: { primary: { busy: [] } } })).toEqual([]);
  const busy = [{ start: "2026-11-02T15:00:00Z", end: "2026-11-02T16:00:00Z" }];
  expect(parseBusy({ calendars: { primary: { busy } } })).toEqual(busy);
});

it("classifies Google request failures and rejects malformed successful responses", async () => {
  const args = [config, "refresh", "2026-11-02T00:00:00Z", "2026-11-09T00:00:00Z"] as const;
  mocks.request.mockRejectedValue({ response: { status: 403, data: { error: { details: [{ reason: "SERVICE_DISABLED" }] } } } });
  await expect(readBusy(...args)).rejects.toMatchObject({ code: "api_disabled" });
  mocks.request.mockResolvedValue({ data: { calendars: {} } });
  await expect(readBusy(...args)).rejects.toMatchObject({ code: "invalid_response" });
  mocks.request.mockResolvedValue({ data: { calendars: { primary: { busy: [], errors: [{ reason: "notFound" }] } } } });
  await expect(readBusy(...args)).rejects.toMatchObject({ code: "calendar_unavailable" });
  mocks.request.mockResolvedValue({ data: { calendars: { primary: { busy: [] } } } });
  await expect(readBusy(...args)).resolves.toEqual([]);
});

afterEach(() => vi.unstubAllEnvs());
it("only requests and requires event-write permission when enabled", async () => {
  mocks.generateCodeVerifierAsync.mockResolvedValue({ codeVerifier: "verifier", codeChallenge: "challenge" });
  mocks.generateAuthUrl.mockReturnValue("https://accounts.google.com/consent");
  vi.stubEnv("CALENDAR_EVENTS_ENABLED", "false");
  await consentUrl(config, "state");
  expect(mocks.generateAuthUrl.mock.lastCall?.[0].scope).toEqual(["openid", "email", busyScope]);
  vi.stubEnv("CALENDAR_EVENTS_ENABLED", "true");
  await consentUrl(config, "state");
  expect(mocks.generateAuthUrl.mock.lastCall?.[0].scope).toEqual(["openid", "email", busyScope, eventScope]);
  mocks.getToken.mockResolvedValue({ tokens: { id_token: "id", refresh_token: "refresh", scope: busyScope } });
  await expect(exchangeCode(config, "code", "verifier")).rejects.toThrow("Incomplete calendar consent");
  mocks.getToken.mockResolvedValue({ tokens: { id_token: "id", refresh_token: "refresh", scope: `${busyScope} ${eventScope}` } });
  mocks.verifyIdToken.mockResolvedValue({ getPayload: () => ({ email: "owner@example.com", email_verified: true }) });
  await expect(exchangeCode(config, "code", "verifier")).resolves.toMatchObject({ eventWriteGranted: true });
});
