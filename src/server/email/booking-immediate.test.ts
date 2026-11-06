import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/server/db", () => ({ getDatabase: vi.fn(() => ({})) }));
vi.mock("@/server/email/config", () => ({ readEmailConfig: vi.fn() }));
vi.mock("@/server/email/worker", () => ({ drainEmail: vi.fn() }));
import { after } from "next/server";
import { readEmailConfig } from "./config";
import { drainEmail } from "./worker";
import { scheduleBookingEmails } from "./immediate";

let callback: () => Promise<void>;
beforeEach(() => {
  vi.mocked(after).mockImplementation(fn => { callback = fn as () => Promise<void>; });
  vi.mocked(readEmailConfig).mockReturnValue({ apiKey: "key", from: "from@example.com", owner: "owner@example.com", origin: "https://example.com" });
});

it("sends only the confirmed booking after the response", async () => {
  scheduleBookingEmails("confirmed-id");
  expect(drainEmail).not.toHaveBeenCalled();
  await callback();
  expect(drainEmail).toHaveBeenCalledWith({}, "key", undefined, undefined, "confirmed-id");
});

it("preserves scheduled recovery if the immediate attempt fails", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(drainEmail).mockRejectedValue(new Error("private token"));
  scheduleBookingEmails("confirmed-id");
  await expect(callback()).resolves.toBeUndefined();
  expect(log.mock.calls.flat().join(" ")).not.toContain("private token");
});
