import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/auth/access", () => ({ getAdminAccess: vi.fn() }));
vi.mock("@/server/resume/storage", () => ({ MAX_RESUME_BYTES: 5 * 1024 * 1024, resumeConfigured: vi.fn(), putResume: vi.fn(), getResume: vi.fn() }));
import { getAdminAccess } from "@/server/auth/access";
import { resumeConfigured, putResume, getResume } from "@/server/resume/storage";
import { uploadResume, downloadResume } from "@/server/resume/endpoint";
const pdf = "%PDF-1.7\nA local test document\n%%EOF";
function request(body = pdf, extra: Record<string, string> = {}) {
  return new Request("https://example.com/api/admin/resume", { method: "POST", headers: { origin: "https://example.com", "content-type": "application/pdf", ...extra }, body });
}
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_URL", "https://example.com");
  vi.mocked(getAdminAccess).mockResolvedValue({ status: "authorized", user: { id: "owner", name: "Owner" } } as never);
  vi.mocked(resumeConfigured).mockReturnValue(true);
  vi.mocked(putResume).mockResolvedValue(undefined);
});
it.each(["unauthenticated", "forbidden", "unavailable"] as const)("blocks %s before writing storage", async status => {
  vi.mocked(getAdminAccess).mockResolvedValue({ status });
  expect((await uploadResume(request())).status).toBe(status === "unavailable" ? 503 : 403);
  expect(putResume).not.toHaveBeenCalled();
});
it("rejects foreign origins and unsupported formats", async () => {
  expect((await uploadResume(request(pdf, { origin: "https://other.com" }))).status).toBe(403);
  expect((await uploadResume(request(pdf, { "content-type": "text/plain" }))).status).toBe(415);
  expect((await uploadResume(request("not a real PDF document"))).status).toBe(400);
  expect((await uploadResume(request("%PDF-1.7\nTruncated document"))).status).toBe(400);
  expect(putResume).not.toHaveBeenCalled();
});
it("enforces actual bytes without relying on content-length", async () => {
  expect((await uploadResume(request("x".repeat(5 * 1024 * 1024 + 1)))).status).toBe(413);
  expect(putResume).not.toHaveBeenCalled();
});
it("publishes only after storage confirms success and handles unavailable configuration", async () => {
  expect((await uploadResume(request())).status).toBe(200);
  expect(putResume).toHaveBeenCalledWith(Buffer.from(pdf));
  vi.mocked(resumeConfigured).mockReturnValue(false);
  expect((await uploadResume(request())).status).toBe(503);
});
it("does not claim success for failed writes", async () => {
  vi.mocked(putResume).mockRejectedValue(new Error("private provider details"));
  const result = await uploadResume(request());
  expect(result.status).toBe(503);
  expect(await result.text()).not.toContain("private provider");
});
it("downloads only the current PDF as an uncached attachment", async () => {
  vi.mocked(getResume).mockResolvedValue(Buffer.from(pdf));
  const result = await downloadResume();
  expect(result.status).toBe(200);
  expect(result.headers.get("Content-Disposition")).toContain("attachment");
  expect(result.headers.get("Cache-Control")).toBe("no-store");
  expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(await result.text()).toBe(pdf);
});
it("distinguishes missing resumes from storage failure", async () => {
  vi.mocked(getResume).mockRejectedValue({ $metadata: { httpStatusCode: 404 } });
  expect((await downloadResume()).status).toBe(404);
  vi.mocked(getResume).mockRejectedValue(new Error("provider secret"));
  expect((await downloadResume()).status).toBe(503);
  vi.mocked(resumeConfigured).mockReturnValue(false);
  expect((await downloadResume()).status).toBe(404);
});
