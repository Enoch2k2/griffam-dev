import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ database: vi.fn(), runtime: vi.fn(), read: vi.fn(), cancel: vi.fn(), schedule: vi.fn() }));
vi.mock("@/server/db", () => ({ getDatabase: mocks.database }));
vi.mock("./readiness", () => ({ readBookingRuntime: mocks.runtime }));
vi.mock("./management", () => ({ readManagedBooking: mocks.read, cancelManagedBooking: mocks.cancel }));
vi.mock("@/server/email/immediate", () => ({ scheduleBookingEmails: mocks.schedule }));
import { manageBooking } from "./management-endpoint";

const token = "A".repeat(43);
function request(action: string, origin = "https://example.com") {
  return new Request("https://example.com/api/booking/manage", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ action, token }),
  });
}
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_URL", "https://example.com");
  mocks.database.mockReset().mockReturnValue({ db: true });
  mocks.runtime.mockReset().mockResolvedValue({ booking: true });
  mocks.read.mockReset().mockResolvedValue({ id: "booking-id", status: "confirmed" });
  mocks.cancel.mockReset().mockResolvedValue({ status: "cancelled", id: "booking-id" });
  mocks.schedule.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

it("reads a booking from the token in a same-origin request body", async () => {
  const response = await manageBooking(request("read"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ booking: { id: "booking-id", status: "confirmed" } });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(mocks.read).toHaveBeenCalledWith({ db: true }, token);
  expect(mocks.runtime).not.toHaveBeenCalled();
});

it("cancels, then schedules the queued client notice for delivery", async () => {
  const response = await manageBooking(request("cancel"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "cancelled" });
  expect(mocks.cancel).toHaveBeenCalledWith({ db: true }, token, { booking: true });
  expect(mocks.schedule).toHaveBeenCalledWith("booking-id");
});

it("rejects cross-origin and malformed management requests before database access", async () => {
  expect((await manageBooking(request("read", "https://attacker.example"))).status).toBe(403);
  expect((await manageBooking(request("delete"))).status).toBe(400);
  expect(mocks.database).not.toHaveBeenCalled();
});
