import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../../src/server/db/connection";

import { beginConsent, claimConsent, finishConsent, readConnection, disconnectCalendar } from "../../src/server/calendar/store";

const testURL = process.env.TEST_DATABASE_URL;
if (process.env.CI && !testURL) throw new Error("CI requires TEST_DATABASE_URL");
describe.skipIf(!testURL)("calendar consent persistence", () => {
  let control: Pool;
  let database: ReturnType<typeof createDatabase>;
  const name = `griffamdev_calendar_${randomUUID().replaceAll("-", "")}`;
  beforeAll(async () => {
    const url = new URL(testURL!);
    if (!url.pathname.endsWith("_test")) throw new Error("Use a dedicated _test database.");
    control = new Pool({ connectionString: testURL });
    await control.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`; database = createDatabase(url.toString());
    await migrate(database.db, { migrationsFolder: "./drizzle" });
  });
  afterAll(async () => {
    await database?.pool.end();
    if (control) { await control.query(`DROP DATABASE IF EXISTS "${name}"`); await control.end(); }
  });
  it("claims consent once and prevents stale callbacks after reconnect/disconnect", async () => {
    const db = database.db;
    await beginConsent(db, "owner", "state-1", "encrypted-verifier");
    const claims = await Promise.all([claimConsent(db, "owner", "state-1"), claimConsent(db, "owner", "state-1")]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const first = claims.find(Boolean)!;
    await beginConsent(db, "owner", "state-2", "encrypted-verifier");
    expect(await finishConsent(db, first.revision, "state-1", "old", "owner@example.com")).toBe(false);
    expect(await claimConsent(db, "other", "state-2")).toBeNull();
    const second = await claimConsent(db, "owner", "state-2");
    expect(await finishConsent(db, second!.revision, "state-2", "encrypted-token", "owner@example.com")).toBe(true);
    expect((await readConnection(db))?.encryptedRefreshToken).toBe("encrypted-token");
    await beginConsent(db, "owner", "state-3", "encrypted-verifier");
    const third = await claimConsent(db, "owner", "state-3");
    await disconnectCalendar(db);
    expect(await finishConsent(db, third!.revision, "state-3", "old", "owner@example.com")).toBe(false);
    expect(await readConnection(db)).toBeNull();
    await beginConsent(db, "owner", "expired", "encrypted-verifier");
    await database.pool.query("update calendar_connection set state_expires_at = now() - interval '1 minute'");
    expect(await claimConsent(db, "owner", "expired")).toBeNull();
  });
});
