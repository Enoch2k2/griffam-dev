import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/auth/access", () => ({ getAdminAccess: vi.fn() }));
vi.mock("@/server/db", () => ({ getDatabase: vi.fn(() => ({})) }));
vi.mock("@/server/content/store", () => ({ writePost: vi.fn() }));
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { writePost } from "@/server/content/store";
import { adminPosts, adminPost } from "@/server/content/admin";
import { POST } from "@/app/api/admin/posts/route";
import { validatePost } from "@/features/content/validation";
const data = { id: "00000000-0000-4000-8000-000000000001", version: 0, title: "Test article", slug: "test-article", summary: "This is a useful summary.", body: "This is a useful article with enough detail.", action: "publish" };
const request = (body: unknown = data, origin = "https://example.com") => new Request("https://example.com/api/admin/posts", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_URL", "https://example.com");
  vi.mocked(getAdminAccess).mockResolvedValue({ status: "authorized", user: { id: "owner", name: "Owner", email: "owner@example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() } });
  vi.mocked(writePost).mockResolvedValue({ status: "saved", id: data.id, version: 1, published: true });
});
afterEach(() => vi.unstubAllEnvs());
it.each(["unauthenticated", "forbidden", "unavailable"] as const)("denies %s reads and writes before accessing content storage", async status => {
  vi.mocked(getAdminAccess).mockResolvedValue({ status });
  expect((await POST(request())).status).toBe(status === "unavailable" ? 503 : 403);
  expect(await adminPosts(new Headers(), 1)).toEqual({ status: "denied" });
  expect(await adminPost(new Headers(), data.id)).toEqual({ status: "denied" });
  expect(getDatabase).not.toHaveBeenCalled();
});
it("rejects cross-origin writes", async () => {
  expect((await POST(request(data, "https://foreign.example"))).status).toBe(403);
  expect(writePost).not.toHaveBeenCalled();
});
it("validates content and bounds streamed requests", async () => {
  expect((await POST(request({ ...data, slug: "../private" }))).status).toBe(400);
  expect((await POST(request({ body: "x".repeat(200001) }))).status).toBe(413);
  expect(writePost).not.toHaveBeenCalled();
});
it("returns no-store success only after persistence", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(writePost).toHaveBeenCalledWith({}, data);
});
it.each(["conflict", "slug_locked"] as const)("reports %s as a recoverable conflict", async status => {
  vi.mocked(writePost).mockResolvedValue({ status });
  expect((await POST(request())).status).toBe(409);
});
it("handles duplicate slugs and masks unexpected database errors", async () => {
  vi.mocked(writePost).mockRejectedValueOnce({ cause: { code: "23505" } });
  expect((await POST(request())).status).toBe(409);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(writePost).mockRejectedValueOnce(new Error("private details"));
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private details");
});
it("allows unfinished drafts but enforces publish requirements and versions", () => {
  expect(validatePost({ ...data, body: "", summary: "", action: "save" })).not.toBeNull();
  expect(validatePost({ ...data, body: "", action: "publish" })).toBeNull();
  expect(validatePost({ ...data, version: -1 })).toBeNull();
});
