import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health contract", () => {
  it("runs in Node without browser globals and returns an uncached public liveness response", async () => {
    expect(typeof window).toBe("undefined");
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    // Exact public contract prevents accidentally exposing environment or provider details.
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
