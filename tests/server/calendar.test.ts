import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/server/auth/access", () => ({ getAdminAccess: vi.fn() }));
vi.mock("@/server/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/server/calendar/google", () => ({ consentUrl: vi.fn(), exchangeCode: vi.fn(), readBusy: vi.fn() }));
vi.mock("@/server/calendar/store", () => ({ beginConsent: vi.fn(), claimConsent: vi.fn(), finishConsent: vi.fn(), readConnection: vi.fn(), disconnectCalendar: vi.fn() }));
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { consentUrl, exchangeCode, readBusy } from "@/server/calendar/google";
import { beginConsent, claimConsent, finishConsent, readConnection, disconnectCalendar } from "@/server/calendar/store";
import { startCalendar, calendarCallback, removeCalendar, testCalendar } from "@/server/calendar/endpoint";
import { encrypt } from "@/server/calendar/crypto";
const key = Buffer.alloc(32, 1);
const state = "a".repeat(43);
function post(origin = "https://example.com") { return new Request("https://example.com/api/admin/calendar/connect", { method: "POST", headers: { origin } }); }
function callback(query = `state=${state}&code=code`, cookie = state) {
  return new NextRequest(`https://example.com/api/admin/calendar/callback?${query}`, { headers: { cookie: `griffamdev-calendar-state=${cookie}` } });
}
beforeEach(() => {
  for (const [name, value] of Object.entries({ BETTER_AUTH_URL: "https://example.com", BETTER_AUTH_SECRET: "x".repeat(32), ADMIN_EMAIL: "owner@example.com", GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret", DATABASE_URL: "unused", CALENDAR_ENABLED: "true", CALENDAR_TOKEN_KEY: key.toString("hex") })) vi.stubEnv(name, value);
  vi.mocked(getAdminAccess).mockResolvedValue({ status: "authorized", user: { id: "owner" } } as never);
  vi.mocked(consentUrl).mockResolvedValue({ url: "https://accounts.google.com/o/oauth2/v2/auth", verifier: "private-verifier" });
  vi.mocked(claimConsent).mockResolvedValue({ revision: 2, encryptedVerifier: encrypt("private-verifier", key) } as never);
  vi.mocked(exchangeCode).mockResolvedValue({ refreshToken: "private-refresh", email: "owner@example.com" });
  vi.mocked(finishConsent).mockResolvedValue(true);
});
it("denies every endpoint before database/provider work for nonowners", async () => {
  vi.mocked(getAdminAccess).mockResolvedValue({ status: "unauthenticated" });
  expect((await startCalendar(post())).status).toBe(403);
  expect((await testCalendar(post())).status).toBe(403);
  expect((await removeCalendar(post())).status).toBe(403);
  expect((await calendarCallback(callback())).headers.get("location")).toContain("result=failed");
  expect(getDatabase).not.toHaveBeenCalled(); expect(exchangeCode).not.toHaveBeenCalled();
});
it("requires same-origin POSTs and valid feature configuration", async () => {
  for (const handler of [startCalendar, testCalendar, removeCalendar]) expect((await handler(post("https://evil.example"))).status).toBe(403);
  vi.stubEnv("CALENDAR_TOKEN_KEY", "bad");
  expect((await startCalendar(post())).status).toBe(503); expect(beginConsent).not.toHaveBeenCalled();
});
it("starts consent with an HttpOnly secure cookie and encrypted verifier", async () => {
  const response = await startCalendar(post());
  expect(response.status).toBe(303);
  expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/);
  expect(response.headers.get("set-cookie")).toMatch(/Secure/);
  expect(response.headers.get("set-cookie")).toMatch(/SameSite=lax/);
  expect(JSON.stringify(vi.mocked(beginConsent).mock.calls)).not.toContain("private-verifier");
});
it("rejects mismatched state, expired/replayed claims and denied consent without exchanging codes", async () => {
  expect((await calendarCallback(callback(undefined, "wrong"))).headers.get("location")).toContain("failed");
  expect(claimConsent).not.toHaveBeenCalled();
  expect((await calendarCallback(callback(`state=${state}&error=access_denied`))).headers.get("location")).toContain("cancelled");
  vi.mocked(claimConsent).mockResolvedValue(null);
  expect((await calendarCallback(callback())).headers.get("location")).toContain("failed");
  expect(exchangeCode).not.toHaveBeenCalled();
});
it("encrypts a successful credential and respects disconnect/new-consent races", async () => {
  const response = await calendarCallback(callback());
  expect(response.headers.get("location")).toContain("connected");
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(JSON.stringify(vi.mocked(finishConsent).mock.calls)).not.toContain("private-refresh");
  vi.mocked(finishConsent).mockResolvedValue(false);
  expect((await calendarCallback(callback())).headers.get("location")).toContain("failed");
});
it("sanitizes provider errors and never reports busy lookup failure as a successful empty calendar", async () => {
  vi.mocked(exchangeCode).mockRejectedValue(new Error("private-refresh"));
  expect((await calendarCallback(callback())).headers.get("location")).toBe("https://example.com/admin/calendar?result=failed");
  vi.mocked(readConnection).mockResolvedValue({ encryptedRefreshToken: encrypt("private-refresh", key) } as never);
  vi.mocked(readBusy).mockRejectedValue(new Error("secret"));
  const response = await testCalendar(post());
  expect(response.status).toBe(503); expect(await response.text()).not.toContain("secret");
  vi.mocked(readBusy).mockResolvedValue([]);
  expect((await testCalendar(post())).status).toBe(200);
});
it("can delete the local connection even with a missing encryption key", async () => {
  vi.stubEnv("CALENDAR_TOKEN_KEY", "");
  expect((await removeCalendar(post())).headers.get("location")).toContain("disconnected");
  expect(disconnectCalendar).toHaveBeenCalledOnce();
});
it("distinguishes unreadable credentials from provider failures without exposing secrets", async () => {
  vi.mocked(readConnection).mockResolvedValue({ encryptedRefreshToken: "bad-secret-token" } as never);
  const response = await testCalendar(post());
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: "credential" });
  expect(readBusy).not.toHaveBeenCalled();
});
