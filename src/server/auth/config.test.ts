import { describe, expect, it } from "vitest";
import { isOwner, readAuthConfig } from "./config";
const env = {
  DATABASE_URL: "postgresql://localhost/unused",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
  ADMIN_EMAIL: "Owner@example.com",
  GOOGLE_CLIENT_ID: "test-client",
  GOOGLE_CLIENT_SECRET: "test-secret",
};
describe("owner authentication configuration", () => {
  it("fails closed when settings are missing", () => {
    expect(readAuthConfig({})).toBeNull();
    for (const key of Object.keys(env))
      expect(readAuthConfig({ ...env, [key]: "" })).toBeNull();
  });
  it("normalizes the owner email and exact trusted origin", () => {
    expect(readAuthConfig(env)).toMatchObject({
      ownerEmail: "owner@example.com",
      baseURL: "http://localhost:3000",
    });
  });
  it.each([
    "http://example.com",
    "https://example.com/path",
    "invalid",
    "https://user:pass@example.com",
    "https://example.com?foo=bar",
  ])("rejects invalid origin %s", (url) => {
    expect(readAuthConfig({ ...env, BETTER_AUTH_URL: url })).toBeNull();
  });
  it("requires a strong-length secret and valid email", () => {
    expect(readAuthConfig({ ...env, BETTER_AUTH_SECRET: "short" })).toBeNull();
    expect(readAuthConfig({ ...env, ADMIN_EMAIL: "invalid" })).toBeNull();
  });
  it("rejects unverified and non-owner identities", () => {
    expect(
      isOwner(
        { email: "owner@example.com", emailVerified: false },
        env.ADMIN_EMAIL,
      ),
    ).toBe(false);
    expect(
      isOwner(
        { email: "other@example.com", emailVerified: true },
        env.ADMIN_EMAIL,
      ),
    ).toBe(false);
    expect(
      isOwner(
        { email: "owner@example.com", emailVerified: true },
        env.ADMIN_EMAIL,
      ),
    ).toBe(true);
  });
});
