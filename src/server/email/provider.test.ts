import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./provider";
import { inquiryEmails } from "./templates";
import { readEmailConfig } from "./config";
const config = { apiKey: "test-key", from: "hello@notify.example.com", owner: "owner@example.com", origin: "https://example.com" };
const input = { id: "test", name: "<script>spam</script>", email: "visitor@example.com", service: "Web application", message: "https://untrusted.example malicious content" };
const jobs = inquiryEmails(input, config);
afterEach(() => vi.unstubAllGlobals());
describe("inquiry email delivery", () => {
  it("keeps visitor receipts generic and owner messages private behind sign-in", () => {
    expect(jobs[1].payload.text).not.toContain(input.message);
    expect(jobs[1].payload.text).not.toContain(input.name);
    expect(jobs[1].payload.text).toContain("No call has been booked");
    expect(jobs[0].payload.text).toContain("https://example.com/admin/inquiries");
    expect(jobs[0].payload.to).toEqual([config.owner]);
    expect(jobs[0].payload.reply_to).toBe(input.email);
    expect(jobs[1].payload.reply_to).toBe(config.owner);
  });
  it("fails closed unless delivery is explicitly enabled and fully configured", () => {
    const env = { EMAIL_ENABLED: "true", RESEND_API_KEY: "key", EMAIL_FROM: config.from,
      ADMIN_EMAIL: config.owner, BETTER_AUTH_URL: config.origin, EMAIL_WORKER_SECRET: "x".repeat(32) };
    expect(readEmailConfig(env)).not.toBeNull();
    for (const field of Object.keys(env)) expect(readEmailConfig({ ...env, [field]: "" })).toBeNull();
    expect(readEmailConfig({ ...env, EMAIL_FROM: "hi\r\nBcc:bad@example.com" })).toBeNull();
    expect(readEmailConfig({ ...env, BETTER_AUTH_URL: "http://example.com" })).toBeNull();
  });
  it("uses the same provider key and immutable payload on retry", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: "provider-1" }));
    vi.stubGlobal("fetch", fetch);
    expect(await sendEmail(jobs[0].payload, jobs[0].id, "key")).toEqual({ status: "accepted", id: "provider-1" });
    expect(fetch.mock.calls[0][0]).toBe("https://api.resend.com/emails");
    expect(fetch.mock.calls[0][1].headers["Idempotency-Key"]).toBe(jobs[0].id);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(jobs[0].payload);
  });
  it.each([[429, "retry"], [503, "retry"], [401, "failed"], [422, "failed"], [409, "failed"]])("handles HTTP %s safely", async (status, outcome) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private provider details", { status: Number(status) })));
    expect(await sendEmail(jobs[0].payload, "key", "secret")).toEqual({ status: outcome, error: `provider_http_${status}` });
  });
  it("retries network errors and malformed success responses without exposing raw errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret")));
    expect(await sendEmail(jobs[0].payload, "key", "secret")).toEqual({ status: "retry", error: "provider_unreachable" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
    expect((await sendEmail(jobs[0].payload, "key", "secret")).status).toBe("retry");
  });
});
