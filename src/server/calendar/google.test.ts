import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getToken: vi.fn(), verifyIdToken: vi.fn(), request: vi.fn(), setCredentials: vi.fn() }));
vi.mock("google-auth-library", () => ({ CodeChallengeMethod: { S256: "S256" }, OAuth2Client: class {
  getToken = mocks.getToken; verifyIdToken = mocks.verifyIdToken; request = mocks.request; setCredentials = mocks.setCredentials;
} }));
import { busyScope, exchangeCode, parseBusy, readBusy } from "./google";
import type { CalendarConfig } from "./config";
const config = { googleClientId: "client", ownerEmail: "owner@example.com" } as CalendarConfig;
it("accepts a verified owner only with refresh token and free/busy scope", async () => {
  mocks.getToken.mockResolvedValue({ tokens: { id_token: "id", refresh_token: "refresh", scope: busyScope } });
  mocks.verifyIdToken.mockResolvedValue({ getPayload: () => ({ email: "owner@example.com", email_verified: true }) });
  expect(await exchangeCode(config, "code", "verifier")).toEqual({ email: "owner@example.com", refreshToken: "refresh" });
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
