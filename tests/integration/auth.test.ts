import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { makeSignature } from "better-auth/crypto";
import { createDatabase } from "../../src/server/db/connection";
import * as schema from "../../src/server/db/schema";
import { createAuth } from "../../src/server/auth/create-auth";

const testURL = process.env.TEST_DATABASE_URL;
if (process.env.CI && !testURL)
  throw new Error(
    "CI requires TEST_DATABASE_URL for database integration tests.",
  );
const config = {
  baseURL: "http://localhost:3000",
  ownerEmail: "owner@example.com",
  secret: "integration-only-secret-never-use-in-production-0123456789",
  googleClientId: "integration-client",
  googleClientSecret: "integration-secret",
};

describe.skipIf(!testURL)("PostgreSQL migrations and authentication", () => {
  let control: Pool;
  let database: ReturnType<typeof createDatabase>;
  let auth: ReturnType<typeof createAuth>;
  const name = `griffamdev_test_${randomUUID().replaceAll("-", "")}`;
  beforeAll(async () => {
    const url = new URL(testURL!);
    if (!url.pathname.endsWith("_test"))
      throw new Error(
        "TEST_DATABASE_URL must name a dedicated database ending in _test.",
      );
    control = new Pool({ connectionString: testURL });
    await control.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`;
    database = createDatabase(url.toString());
    await migrate(database.db, { migrationsFolder: "./drizzle" });
    auth = createAuth(database.db, config);
  });
  beforeEach(async () => {
    await database.db.delete(schema.user);
    await database.db.delete(schema.verification);
  });
  afterAll(async () => {
    await database?.pool.end();
    if (control) {
      await control.query(`DROP DATABASE IF EXISTS "${name}"`);
      await control.end();
    }
  });
  async function insertUser(email = config.ownerEmail, emailVerified = true) {
    const user = { id: randomUUID(), name: "Test owner", email, emailVerified };
    await database.db.insert(schema.user).values(user);
    return user;
  }
  async function cookieFor(
    userId: string,
    expiresAt = new Date(Date.now() + 3600_000),
  ) {
    const token = randomUUID();
    await database.db
      .insert(schema.session)
      .values({ id: randomUUID(), token, userId, expiresAt });
    const signature = await makeSignature(token, config.secret);
    return `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
  }
  it("applies migrations to an empty database and reruns without losing records", async () => {
    const user = await insertUser();
    await migrate(database.db, { migrationsFolder: "./drizzle" });
    expect(await database.db.select().from(schema.user)).toMatchObject([user]);
  });
  it("enforces unique identities, foreign keys and cascading session removal", async () => {
    const user = await insertUser();
    await expect(
      database.db.insert(schema.user).values({ ...user, id: randomUUID() }),
    ).rejects.toThrow();
    await expect(
      database.db
        .insert(schema.session)
        .values({
          id: randomUUID(),
          token: randomUUID(),
          userId: "missing",
          expiresAt: new Date(),
        }),
    ).rejects.toThrow();
    await cookieFor(user.id);
    await database.db.delete(schema.user).where(eq(schema.user.id, user.id));
    expect(await database.db.select().from(schema.session)).toEqual([]);
  });
  it("rejects duplicate Google identities", async () => {
    const user = await insertUser();
    const account = {
      id: randomUUID(),
      userId: user.id,
      providerId: "google",
      accountId: "google-subject",
    };
    await database.db.insert(schema.account).values(account);
    await expect(
      database.db
        .insert(schema.account)
        .values({ ...account, id: randomUUID() }),
    ).rejects.toThrow();
  });
  it("reads a signed session and rejects tampered, expired and revoked sessions", async () => {
    const user = await insertUser();
    const cookie = await cookieFor(user.id);
    expect(
      await auth.api.getSession({ headers: new Headers({ cookie }) }),
    ).toMatchObject({ user: { id: user.id } });
    expect(
      await auth.api.getSession({
        headers: new Headers({ cookie: cookie + "tampered" }),
      }),
    ).toBeNull();
    const expired = await cookieFor(user.id, new Date(Date.now() - 1000));
    expect(
      await auth.api.getSession({ headers: new Headers({ cookie: expired }) }),
    ).toBeNull();
    await database.db.delete(schema.session);
    expect(
      await auth.api.getSession({ headers: new Headers({ cookie }) }),
    ).toBeNull();
  });
  it("blocks provisioning non-owner and unverified users through library hooks", async () => {
    const context = await auth.$context;
    await expect(
      context.internalAdapter.createOAuthUser(
        { name: "Other", email: "other@example.com", emailVerified: true },
        { providerId: "google", accountId: "other-subject" },
      ),
    ).rejects.toThrow("not authorized");
    await expect(
      context.internalAdapter.createOAuthUser(
        { name: "Owner", email: config.ownerEmail, emailVerified: false },
        { providerId: "google", accountId: "unverified-subject" },
      ),
    ).rejects.toThrow("not authorized");
    expect(await database.db.select().from(schema.user)).toEqual([]);
    const owner = await context.internalAdapter.createOAuthUser(
      { name: "Owner", email: config.ownerEmail, emailVerified: true },
      { providerId: "google", accountId: "owner-subject" },
    );
    expect(owner.user.email).toBe(config.ownerEmail);
  });
  it("denies new sessions to existing non-owner records", async () => {
    const user = await insertUser("other@example.com");
    const context = await auth.$context;
    await expect(
      context.internalAdapter.createSession(user.id),
    ).rejects.toThrow("not authorized");
  });
  it("disables password signup and rejects foreign-origin requests", async () => {
    const response = await auth.handler(
      new Request(`${config.baseURL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: config.baseURL },
        body: JSON.stringify({
          name: "Other",
          email: "other@example.com",
          password: "not-a-real-password",
        }),
      }),
    );
    expect(response.ok).toBe(false);
    expect(await database.db.select().from(schema.user)).toEqual([]);
    const foreign = await auth.handler(
      new Request(`${config.baseURL}/api/auth/sign-in/social`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://untrusted.example",
          "Sec-Fetch-Site": "cross-site",
          Cookie: "session=untrusted",
        },
        body: JSON.stringify({ provider: "google", callbackURL: "/admin" }),
      }),
    );
    expect(foreign.status).toBe(403);
  });
  it("rejects external callback destinations before starting OAuth", async () => {
    const response = await auth.handler(
      new Request(`${config.baseURL}/api/auth/sign-in/social`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: config.baseURL },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "https://untrusted.example",
        }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
