import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../../src/server/db/connection";
import { holdReservation, reservationBusy } from "../../src/server/booking/reservations";
import { saveSettings } from "../../src/server/booking/settings";
import { initialSettings, candidateSlots } from "../../src/features/booking/availability";
const testURL = process.env.TEST_DATABASE_URL;
if (process.env.CI && !testURL) throw new Error("CI requires TEST_DATABASE_URL");
describe.skipIf(!testURL)("reservation concurrency", () => {
  let control: Pool;
  let database: ReturnType<typeof createDatabase>;
  let slots: ReturnType<typeof candidateSlots>;
  const name = `griffamdev_reservations_${randomUUID().replaceAll("-", "")}`;
  const empty = async () => [];
  const input = (index = 0) => ({ id: randomUUID(), start: slots[index].start, name: "Test Client", email: "client@example.com", timeZone: "America/Chicago", notes: "Project planning" });
  beforeAll(async () => {
    const url = new URL(testURL!);
    if (!url.pathname.endsWith("_test")) throw new Error("Use a dedicated _test database.");
    control = new Pool({ connectionString: testURL });
    await control.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`; database = createDatabase(url.toString());
    await migrate(database.db, { migrationsFolder: "./drizzle" });
    await migrate(database.db, { migrationsFolder: "./drizzle" });
    await saveSettings(database.db, initialSettings);
    // Additional day avoids a test racing the 24-hour boundary.
    const candidates = candidateSlots(initialSettings, new Date(Date.now() + 86400000).toISOString(), 20, []);
    const fullDay = candidates.find(slot => candidates.filter(other => other.date === slot.date).length >= 8)!.date;
    slots = candidates.filter(slot => slot.date === fullDay);
  });
  beforeEach(async () => { await database.pool.query("truncate booking_reservation"); });
  afterAll(async () => {
    await database?.pool.end();
    if (control) { await control.query(`DROP DATABASE IF EXISTS "${name}"`); await control.end(); }
  });
  it("serializes competing visitors and excludes adjacent calls inside the buffer", async () => {
    const results = await Promise.all([holdReservation(database.db, input(), empty), holdReservation(database.db, input(), empty)]);
    expect(results.map(result => result.status).sort()).toEqual(["held", "unavailable"]);
    expect((await holdReservation(database.db, input(1), empty)).status).toBe("unavailable");
    expect((await holdReservation(database.db, input(2), empty)).status).toBe("held");
  });
  it("handles duplicate submissions without extending their hold or accepting altered details", async () => {
    const value = input();
    const first = await holdReservation(database.db, value, empty);
    const again = await holdReservation(database.db, value, empty);
    expect(first.status).toBe("held"); expect(again.status).toBe("existing");
    if (first.status === "held" && again.status === "existing") expect(again.expiresAt).toBe(first.expiresAt);
    expect((await holdReservation(database.db, { ...value, email: "other@example.com" }, empty)).status).toBe("id_conflict");
  });
  it("fails closed on provider errors, busy intervals, notice and horizon violations", async () => {
    const value = input();
    await expect(holdReservation(database.db, value, async () => { throw new Error("provider unavailable"); })).rejects.toThrow("provider unavailable");
    expect((await database.pool.query("select count(*) from booking_reservation")).rows[0].count).toBe("0");
    expect((await holdReservation(database.db, value, async () => [{ start: slots[0].start, end: slots[0].end }])).status).toBe("unavailable");
    const provider = vi.fn(empty);
    expect((await holdReservation(database.db, { ...value, start: "2020-01-01T15:00:00Z" }, provider)).status).toBe("unavailable");
    expect((await holdReservation(database.db, { ...value, start: "2099-01-01T15:00:00Z" }, provider)).status).toBe("unavailable");
    expect(provider).not.toHaveBeenCalled();
  });
  it("releases expired holds but never automatically releases uncertain provisioning", async () => {
    const value = input(); await holdReservation(database.db, value, empty);
    await database.pool.query("update booking_reservation set expires_at = now() - interval '1 minute'");
    expect(await reservationBusy(database.db, new Date(slots[0].start), new Date(slots[2].end))).toEqual([]);
    expect((await holdReservation(database.db, value, empty)).status).toBe("expired");
    expect((await holdReservation(database.db, input(), empty)).status).toBe("held");
    await database.pool.query("update booking_reservation set status = 'needs_review', expires_at = now() - interval '1 minute' where status = 'held'");
    expect((await holdReservation(database.db, input(), empty)).status).toBe("unavailable");
    expect(await reservationBusy(database.db, new Date(slots[0].start), new Date(slots[2].end))).toHaveLength(1);
  });
  it("enforces a persistent per-email limit and a database overlap constraint", async () => {
    for (const i of [0, 2, 4]) expect((await holdReservation(database.db, input(i), empty)).status).toBe("held");
    expect((await holdReservation(database.db, input(6), empty)).status).toBe("limited");
    await expect(database.pool.query("insert into booking_reservation select $1, request_hash, name, email, time_zone, notes, starts_at, ends_at, occupied_until, status, expires_at, created_at from booking_reservation limit 1", [randomUUID()])).rejects.toMatchObject({ code: "23P01" });
  });
});
