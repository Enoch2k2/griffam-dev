import { expect, it, vi } from "vitest";
vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));
const { limit } = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock("@/server/db", () => ({
  getDatabase: () => ({ select: () => ({ from: () => ({ limit }) }) }),
}));
import { GET } from "@/app/api/ready/route";
it("reports readiness without exposing database records", async () => {
  limit.mockResolvedValue([{ ready: 1 }]);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ready" });
});
it("returns a generic 503 for connection or migration failures", async () => {
  limit.mockRejectedValue(new Error("sensitive connection detail"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "unavailable" });
});
