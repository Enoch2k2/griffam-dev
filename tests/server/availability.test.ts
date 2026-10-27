import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/auth/access", () => ({ getAdminAccess: vi.fn() }));
vi.mock("@/server/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/server/booking/settings", () => ({ saveSettings: vi.fn() }));
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { saveSettings } from "@/server/booking/settings";
import { updateAvailability } from "@/server/booking/endpoint";
import { initialSettings } from "@/features/booking/availability";
function request(body = JSON.stringify(initialSettings), origin = "https://example.com") {
  return new Request("https://example.com/api/admin/availability", { method: "POST", headers: { origin, "content-type": "application/json" }, body });
}
beforeEach(() => { vi.stubEnv("BETTER_AUTH_URL", "https://example.com"); vi.mocked(getAdminAccess).mockResolvedValue({ status: "authorized" } as never); });
it("rejects anonymous access before touching the database", async () => {
  vi.mocked(getAdminAccess).mockResolvedValue({ status: "unauthenticated" });
  expect((await updateAvailability(request())).status).toBe(403);
  expect(getDatabase).not.toHaveBeenCalled();
});
it("rejects cross-origin, malformed and oversized bodies", async () => {
  expect((await updateAvailability(request(undefined, "https://other.com"))).status).toBe(403);
  expect((await updateAvailability(request("bad"))).status).toBe(400);
  expect((await updateAvailability(request("{}"))).status).toBe(400);
  expect((await updateAvailability(request("x".repeat(16001)))).status).toBe(413);
  expect(saveSettings).not.toHaveBeenCalled();
});
it("returns confirmed settings, conflicts and sanitized storage errors", async () => {
  vi.mocked(saveSettings).mockResolvedValue({ ...initialSettings, version: 1 });
  const response = await updateAvailability(request());
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
  vi.mocked(saveSettings).mockResolvedValue(null);
  expect((await updateAvailability(request())).status).toBe(409);
  vi.mocked(saveSettings).mockRejectedValue(new Error("database secret"));
  const failure = await updateAvailability(request()); expect(failure.status).toBe(503);
  expect(await failure.text()).not.toContain("database secret");
});
