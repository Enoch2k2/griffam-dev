import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), database: vi.fn(), runtime: vi.fn(), cancel: vi.fn(), schedule: vi.fn() }));
vi.mock("@/server/auth/access", () => ({ getAdminAccess: mocks.access }));
vi.mock("@/server/db", () => ({ getDatabase: mocks.database }));
vi.mock("./readiness", () => ({ readBookingRuntime: mocks.runtime }));
vi.mock("./management", () => ({ cancelOwnerBooking: mocks.cancel }));
vi.mock("@/server/email/immediate", () => ({ scheduleBookingEmails: mocks.schedule }));
import { cancelAdminBooking } from "./admin-cancellation";

const id = "123e4567-e89b-42d3-a456-426614174000";
function request(body: unknown = { id }, origin = "https://example.com", type = "application/json") {
  return new Request("https://example.com/api/admin/bookings/cancel", {
    method: "POST", headers: { origin, "Content-Type": type }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_URL", "https://example.com");
  mocks.access.mockReset().mockResolvedValue({ status: "authorized", user: { id: "owner" } });
  mocks.database.mockReset().mockReturnValue({ db: true });
  mocks.runtime.mockReset().mockResolvedValue({ providers: true });
  mocks.cancel.mockReset().mockResolvedValue({ status: "cancelled", id });
  mocks.schedule.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

it("requires owner authentication, same origin, and a valid booking reference", async () => {
  mocks.access.mockResolvedValueOnce({ status: "unauthenticated" });
  expect((await cancelAdminBooking(request())).status).toBe(403);
  expect((await cancelAdminBooking(request({ id }, "https://attacker.example"))).status).toBe(403);
  expect((await cancelAdminBooking(request({ id: "bad" }))).status).toBe(400);
  expect(mocks.cancel).not.toHaveBeenCalled();
});

it("cancels through the provider workflow and schedules the client email", async () => {
  const response = await cancelAdminBooking(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "cancelled", id });
  expect(mocks.cancel).toHaveBeenCalledWith({ db: true }, id, { providers: true });
  expect(mocks.schedule).toHaveBeenCalledWith(id);
});

it("keeps provider cancellation failures pending and reports invalid state", async () => {
  mocks.cancel.mockResolvedValueOnce({ status: "pending", id });
  const pending = await cancelAdminBooking(request());
  expect(pending.status).toBe(202);
  expect(mocks.schedule).not.toHaveBeenCalled();
  mocks.cancel.mockResolvedValueOnce({ status: "invalid" });
  expect((await cancelAdminBooking(request())).status).toBe(409);
});
