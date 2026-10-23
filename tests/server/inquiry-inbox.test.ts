import { describe, expect, it, vi } from "vitest";
vi.mock("@/server/auth/access", () => ({ getAdminAccess: vi.fn() }));
vi.mock("@/server/db", () => ({ getDatabase: vi.fn() }));
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { readInbox } from "@/server/inquiries/inbox";
describe("private inquiry inbox", () => {
  it.each(["unauthenticated", "forbidden", "unavailable"] as const)("does not read messages for %s access", async status => {
    vi.mocked(getAdminAccess).mockResolvedValue({ status });
    expect(await readInbox(new Headers(), 1)).toEqual({ status: "denied" });
    expect(getDatabase).not.toHaveBeenCalled();
  });
});
