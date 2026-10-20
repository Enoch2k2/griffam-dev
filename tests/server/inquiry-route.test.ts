import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/server/db", () => ({ getDatabase: vi.fn(() => ({})) }));
vi.mock("@/server/inquiries/store", () => ({ saveInquiry: vi.fn() }));
import { saveInquiry } from "@/server/inquiries/store";
import { POST } from "@/app/api/inquiries/route";
const origin = "https://www.griffamdev.dev";
const valid = { id: "00000000-0000-4000-8000-000000000001", name: "Test Person", email: "test@example.com", service: "Web application", message: "A useful description of a real project.", website: "" };
const request = (body: unknown = valid, from = origin) => new Request(`${origin}/api/inquiries`, { method: "POST", headers: { origin: from, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_URL", origin); vi.stubEnv("DATABASE_URL", "test-placeholder");
  vi.mocked(saveInquiry).mockResolvedValue("saved");
});
afterEach(() => vi.unstubAllEnvs());
describe("public inquiry endpoint", () => {
  it("acknowledges only a persisted inquiry and exposes no personal data", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "saved" });
    expect(saveInquiry).toHaveBeenCalledOnce();
  });
  it("rejects foreign origins before accessing storage", async () => {
    expect((await POST(request(valid, "https://foreign.example"))).status).toBe(403);
    expect(saveInquiry).not.toHaveBeenCalled();
  });
  it("rejects invalid fields and filled honeypots without writing", async () => {
    expect((await POST(request({ ...valid, email: "invalid" }))).status).toBe(400);
    expect((await POST(request({ ...valid, website: "spam" }))).status).toBe(400);
    expect(saveInquiry).not.toHaveBeenCalled();
  });
  it("bounds streamed input even without Content-Length", async () => {
    expect((await POST(request({ message: "x".repeat(25000) }))).status).toBe(413);
    expect(saveInquiry).not.toHaveBeenCalled();
  });
  it.each([["limited", 429], ["conflict", 409]] as const)("handles %s without claiming success", async (result, status) => {
    vi.mocked(saveInquiry).mockResolvedValue(result);
    expect((await POST(request())).status).toBe(status);
  });
  it("returns a recoverable failure when the database is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(saveInquiry).mockRejectedValue(new Error("sensitive internal error"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("sensitive internal error");
  });
  it("fails closed when configuration is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    expect((await POST(request())).status).toBe(503);
    expect(saveInquiry).not.toHaveBeenCalled();
  });
});
