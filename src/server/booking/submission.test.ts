import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), database: vi.fn(), runtime: vi.fn(), budget: vi.fn(), confirm: vi.fn(), recover: vi.fn() }));
vi.mock("@/server/auth/access", () => ({ getAdminAccess: mocks.access }));
vi.mock("@/server/db", () => ({ getDatabase: mocks.database }));
vi.mock("./readiness", () => ({ readBookingRuntime: mocks.runtime }));
vi.mock("./request-budget", () => ({ takeBookingRequest: mocks.budget }));
vi.mock("./confirmation", () => ({ confirmReservation: mocks.confirm, recoverReservation: mocks.recover }));
import { recoverBooking, submitBooking } from "./submission";

const id = "123e4567-e89b-42d3-a456-426614174000";
const value = { id, start: "2026-12-01T15:00:00Z", name: "Test Client", email: "client@example.com", timeZone: "America/Chicago", notes: "", website: "" };
function request(body: unknown = value, origin = "https://example.com", type = "application/json") {
  return new Request("https://example.com/api/booking/reservations", { method: "POST", headers: { origin, "Content-Type": type }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_URL", "https://example.com");
  mocks.database.mockReturnValue({}); mocks.runtime.mockResolvedValue({}); mocks.budget.mockResolvedValue(true);
  mocks.access.mockResolvedValue({ status: "authorized", user: { id: "owner" } });
});
it("rejects cross-origin, non-JSON, oversized and honeypot submissions before provider work", async () => {
  expect((await submitBooking(request(value, "https://evil.example"))).status).toBe(403);
  expect((await submitBooking(request(value, undefined, "text/plain"))).status).toBe(415);
  const large = request(value); large.headers.set("content-length", "16001");
  expect((await submitBooking(large)).status).toBe(413);
  expect((await submitBooking(request({ ...value, website: "bot" }))).status).toBe(400);
  expect(mocks.runtime).not.toHaveBeenCalled(); expect(mocks.confirm).not.toHaveBeenCalled();
});
it("fails closed when readiness is off and budgets expensive provider work", async () => {
  mocks.runtime.mockResolvedValue(null);
  expect((await submitBooking(request())).status).toBe(503);
  mocks.runtime.mockResolvedValue({}); mocks.budget.mockResolvedValue(false);
  const limited = await submitBooking(request());
  expect(limited.status).toBe(429); expect(limited.headers.get("retry-after")).toBe("60");
  expect(mocks.confirm).not.toHaveBeenCalled();
});
it("maps confirmed, pending, unavailable and mismatched request IDs without exposing details", async () => {
  mocks.confirm.mockResolvedValueOnce({ status: "confirmed", id, start: value.start, end: "2026-12-01T15:30:00.000Z", timeZone: value.timeZone, joinUrl: "https://zoom.us/j/12345678901?pwd=x", emailQueued: true });
  expect((await submitBooking(request())).status).toBe(200);
  mocks.confirm.mockResolvedValueOnce({ status: "pending", id, message: "Not confirmed." });
  expect((await submitBooking(request())).status).toBe(202);
  mocks.confirm.mockResolvedValueOnce({ status: "unavailable" });
  expect((await submitBooking(request())).status).toBe(409);
  mocks.confirm.mockResolvedValueOnce({ status: "conflict" });
  const conflict = await submitBooking(request());
  expect(conflict.status).toBe(409); expect(await conflict.text()).not.toContain("zoom.us");
});
it("protects owner recovery with auth, exact origin, bounded validation and readiness", async () => {
  mocks.access.mockResolvedValueOnce({ status: "unauthenticated" });
  expect((await recoverBooking(request({ id, action: "resume" }))).status).toBe(403);
  expect((await recoverBooking(request({ id, action: "resume" }, "https://evil.example"))).status).toBe(403);
  expect((await recoverBooking(request({ id, action: "unknown" }))).status).toBe(400);
  mocks.runtime.mockResolvedValueOnce(null);
  expect((await recoverBooking(request({ id, action: "resume" }))).status).toBe(503);
  expect(mocks.recover).not.toHaveBeenCalled();
});
it("maps fenced owner recovery outcomes", async () => {
  mocks.recover.mockResolvedValueOnce({ status: "confirmed", id });
  expect((await recoverBooking(request({ id, action: "resume" }))).status).toBe(200);
  mocks.recover.mockResolvedValueOnce({ status: "pending", id, message: "Review" });
  expect((await recoverBooking(request({ id, action: "adopt", meetingId: "12345678901" }))).status).toBe(202);
  mocks.recover.mockResolvedValueOnce({ status: "conflict" });
  expect((await recoverBooking(request({ id, action: "release", acknowledged: true }))).status).toBe(409);
});
