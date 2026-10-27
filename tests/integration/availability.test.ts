import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../../src/server/db/connection";

import { readSettings, saveSettings } from "../../src/server/booking/settings";
import { initialSettings } from "../../src/features/booking/availability";

const testURL = process.env.TEST_DATABASE_URL;
if (process.env.CI && !testURL) throw new Error("CI requires TEST_DATABASE_URL");
describe.skipIf(!testURL)("availability persistence", () => {
  let control: Pool;
  let database: ReturnType<typeof createDatabase>;
  const name = `griffamdev_availability_${randomUUID().replaceAll("-", "")}`;
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
  it("persists hours and allows only one simultaneous save of the same version", async () => {
    expect(await readSettings(database.db)).toEqual(initialSettings);
    const results = await Promise.all([
      saveSettings(database.db, initialSettings),
      saveSettings(database.db, { ...initialSettings, closedDates: ["2026-12-25"] }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await readSettings(database.db)).version).toBe(1);
    const updated = await saveSettings(database.db, { ...initialSettings, version: 1, hours: [] });
    expect(updated?.hours).toEqual([]);
    expect((await readSettings(database.db)).version).toBe(2);
  });
});
