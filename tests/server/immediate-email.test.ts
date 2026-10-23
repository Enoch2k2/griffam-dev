import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/server/db", () => ({ getDatabase: vi.fn(() => ({})) }));
vi.mock("@/server/email/config", () => ({ readEmailConfig: vi.fn() }));
vi.mock("@/server/email/worker", () => ({ drainEmail: vi.fn() }));
import { after } from "next/server";
import { readEmailConfig } from "@/server/email/config";
import { drainEmail } from "@/server/email/worker";
import { scheduleInquiryEmails } from "@/server/email/immediate";

let callback: () => Promise<void>;
beforeEach(() => {
  vi.mocked(after).mockImplementation(fn => { callback = fn as () => Promise<void>; });
  vi.mocked(readEmailConfig).mockReturnValue({ apiKey: "test-key", from: "from@example.com", owner: "owner@example.com", origin: "https://example.com" });
});
it("defers delivery until after the response and scopes it to the saved inquiry", async () => {
  scheduleInquiryEmails("saved-id");
  expect(drainEmail).not.toHaveBeenCalled();
  await callback();
  expect(drainEmail).toHaveBeenCalledWith({}, "test-key", undefined, "saved-id");
});
it("honors the delivery kill switch at execution time", async () => {
  scheduleInquiryEmails("saved-id");
  vi.mocked(readEmailConfig).mockReturnValue(null);
  await callback();
  expect(drainEmail).not.toHaveBeenCalled();
});
it("contains callback failures without leaking errors or changing the inquiry response", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(drainEmail).mockRejectedValue(new Error("private details"));
  scheduleInquiryEmails("saved-id");
  await expect(callback()).resolves.toBeUndefined();
  expect(log.mock.calls.flat().join(" ")).not.toContain("private details");
});
it("contains scheduling failures so saved inquiries still succeed", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(after).mockImplementation(() => { throw new Error("scheduler unavailable"); });
  expect(() => scheduleInquiryEmails("saved-id")).not.toThrow();
});
