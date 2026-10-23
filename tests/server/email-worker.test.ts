import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/db", () => ({ getDatabase: vi.fn(() => ({})) }));
vi.mock("@/server/email/config", () => ({ readEmailConfig: vi.fn() }));
vi.mock("@/server/email/worker", () => ({ drainEmail: vi.fn() }));
import { getDatabase } from "@/server/db";
import { readEmailConfig } from "@/server/email/config";
import { drainEmail } from "@/server/email/worker";
import { POST } from "@/app/api/internal/email/route";
const secret = "worker-test-secret-01234567890123456789";
const request = (token = secret) => new Request("https://example.com/api/internal/email", { method: "POST", headers: { authorization: `Bearer ${token}` } });
beforeEach(() => {
  vi.stubEnv("EMAIL_WORKER_SECRET", secret);
  vi.mocked(readEmailConfig).mockReturnValue({ apiKey: "key", from: "from@example.com", owner: "owner@example.com", origin: "https://example.com" });
});
afterEach(() => vi.unstubAllEnvs());
it("rejects invalid credentials before database access, including Unicode input", async () => {
  for (const token of ["", "wrong", "é".repeat(secret.length)]) expect((await POST(request(token))).status).toBe(401);
  expect(getDatabase).not.toHaveBeenCalled();
  expect(drainEmail).not.toHaveBeenCalled();
});
it("does not drain while disabled or unconfigured", async () => {
  vi.mocked(readEmailConfig).mockReturnValue(null);
  expect((await POST(request())).status).toBe(503);
  expect(drainEmail).not.toHaveBeenCalled();
});
it("returns only aggregate counts with no cache", async () => {
  vi.mocked(drainEmail).mockResolvedValue({ accepted: 2, failed: 0, pending: 0, review: 0 });
  const response = await POST(request());
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ accepted: 2, failed: 0, pending: 0, review: 0 });
});
it("reports database failures without leaking details", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(drainEmail).mockRejectedValue(new Error("private database details"));
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private");
});
