import { beforeEach, describe, expect, it, vi } from "vitest";
const { getSession, getAuth, readAuthConfig } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAuth: vi.fn(),
  readAuthConfig: vi.fn(),
}));
vi.mock("@/server/auth", () => ({ getAuth }));
vi.mock("@/server/auth/config", async (original) => ({
  ...(await original<object>()),
  readAuthConfig,
}));
import { GET } from "@/app/api/admin/session/route";
import { getAdminAccess } from "@/server/auth/access";

describe("admin boundary", () => {
  beforeEach(() => {
    readAuthConfig.mockReturnValue({ ownerEmail: "owner@example.com" });
    getAuth.mockReturnValue({ api: { getSession } });
    getSession.mockResolvedValue(null);
  });
  it("returns 503 without auth configuration", async () => {
    getAuth.mockReturnValue(null);
    expect(
      (await GET(new Request("http://localhost/api/admin/session"))).status,
    ).toBe(503);
    expect(getSession).not.toHaveBeenCalled();
  });
  it("returns 401 for guests without private information", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/session"),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Admin access required." });
  });
  it.each([
    { email: "other@example.com", emailVerified: true },
    { email: "owner@example.com", emailVerified: false },
  ])("returns 403 for an unauthorized session", async (user) => {
    getSession.mockResolvedValue({ user });
    expect(
      (await GET(new Request("http://localhost/api/admin/session"))).status,
    ).toBe(403);
  });
  it("returns only owner display fields", async () => {
    getSession.mockResolvedValue({
      user: {
        email: "owner@example.com",
        emailVerified: true,
        name: "Owner",
        id: "private-id",
      },
      session: { token: "secret" },
    });
    const response = await GET(
      new Request("http://localhost/api/admin/session"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: { name: "Owner", email: "owner@example.com" },
    });
  });
  it("does not grant access on database failure", async () => {
    getSession.mockRejectedValue(new Error("Database unavailable"));
    await expect(getAdminAccess(new Headers())).rejects.toThrow(
      "Database unavailable",
    );
  });
});
