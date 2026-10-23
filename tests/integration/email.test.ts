import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../../src/server/db/connection";
import { emailJob, inquiry } from "../../src/server/db/schema";
import { saveInquiry } from "../../src/server/inquiries/store";
import { claimEmail, drainEmail } from "../../src/server/email/worker";
const testURL = process.env.TEST_DATABASE_URL;
if (process.env.CI && !testURL) throw new Error("CI requires TEST_DATABASE_URL");
const config = { apiKey: "test", from: "hello@notify.example.com", owner: "owner@example.com", origin: "https://example.com" };
describe.skipIf(!testURL)("transactional inquiry outbox", () => {
  let control: Pool;
  let database: ReturnType<typeof createDatabase>;
  const name = `griffamdev_email_${randomUUID().replaceAll("-", "")}`;
  const input = () => ({ id: randomUUID(), name: "Test Visitor", email: "visitor@example.com", service: "Web application", message: "Please build a useful application." });
  beforeAll(async () => {
    const url = new URL(testURL!);
    if (!url.pathname.endsWith("_test")) throw new Error("Use a dedicated _test database.");
    control = new Pool({ connectionString: testURL });
    await control.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`;
    database = createDatabase(url.toString());
    await migrate(database.db, { migrationsFolder: "./drizzle" });
  });
  beforeEach(async () => { await database.db.delete(inquiry); });
  afterAll(async () => {
    await database?.pool.end();
    if (control) { await control.query(`DROP DATABASE IF EXISTS "${name}"`); await control.end(); }
  });
  it("atomically queues two immutable emails once across concurrent retries", async () => {
    const data = input();
    expect(await Promise.all(Array.from({ length: 5 }, () => saveInquiry(database.db, data, config)))).toEqual(Array(5).fill("queued"));
    const jobs = await database.db.select().from(emailJob);
    expect(jobs).toHaveLength(2);
    expect(await saveInquiry(database.db, data, { ...config, owner: "changed@example.com" })).toBe("queued");
    expect(await database.db.select().from(emailJob)).toEqual(jobs);
  });
  it("does not backfill historical inquiries when email is later enabled", async () => {
    const data = input();
    expect(await saveInquiry(database.db, data, null)).toBe("saved");
    expect(await saveInquiry(database.db, data, config)).toBe("saved");
    expect(await database.db.select().from(emailJob)).toHaveLength(0);
  });
  it("rolls back the inquiry if its outbox cannot be inserted", async () => {
    await database.db.execute(sql`alter table email_job add constraint test_no_jobs check (false)`);
    try {
      await expect(saveInquiry(database.db, input(), config)).rejects.toThrow();
      expect(await database.db.select().from(inquiry)).toHaveLength(0);
    } finally { await database.db.execute(sql`alter table email_job drop constraint test_no_jobs`); }
  });
  it("concurrent workers send each job once and leave accepted jobs alone", async () => {
    await saveInquiry(database.db, input(), config);
    const send = vi.fn().mockResolvedValue({ status: "accepted", id: "provider-id" });
    await Promise.all([drainEmail(database.db, "key", send), drainEmail(database.db, "key", send)]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(new Set(send.mock.calls.map(call => call[1])).size).toBe(2);
    await drainEmail(database.db, "key", send);
    expect(send).toHaveBeenCalledTimes(2);
    expect((await database.db.select().from(emailJob)).every(job => job.status === "accepted")).toBe(true);
  });
  it("recovers stale leases and retries transient failures with the original payload/key", async () => {
    await saveInquiry(database.db, input(), config);
    const claimed = await claimEmail(database.db);
    expect(claimed?.review).toBe(false);
    await database.db.update(emailJob).set({ leaseUntil: new Date(0) }).where(eq(emailJob.status, "processing"));
    const send = vi.fn().mockResolvedValue({ status: "retry", error: "provider_unreachable" });
    await drainEmail(database.db, "key", send);
    expect(send).toHaveBeenCalledTimes(2);
    const first = send.mock.calls.map(call => [call[0], call[1]]);
    await database.db.update(emailJob).set({ availableAt: new Date(0) });
    send.mockResolvedValue({ status: "accepted", id: "recovered" });
    await drainEmail(database.db, "key", send);
    for (const call of send.mock.calls.slice(2)) expect(first).toContainEqual([call[0], call[1]]);
  });
  it("immediate attempts process only the submitted inquiry and honor retry delays", async () => {
    const older = input();
    const fresh = input();
    await saveInquiry(database.db, older, config);
    await saveInquiry(database.db, fresh, config);
    const send = vi.fn().mockResolvedValue({ status: "retry", error: "provider_unreachable" });
    await drainEmail(database.db, "key", send, fresh.id);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.every(call => call[1].endsWith(fresh.id))).toBe(true);
    await drainEmail(database.db, "key", send, fresh.id);
    expect(send).toHaveBeenCalledTimes(2);
    const oldJobs = await database.db.select().from(emailJob).where(eq(emailJob.inquiryId, older.id));
    expect(oldJobs.every(job => job.attempts === 0)).toBe(true);
  });
  it("stops uncertain sends outside the provider deduplication window", async () => {
    await saveInquiry(database.db, input(), config);
    await database.db.update(emailJob).set({ firstAttemptAt: new Date(Date.now() - 24 * 3600000), attempts: 1 });
    const send = vi.fn();
    expect((await drainEmail(database.db, "key", send)).review).toBe(2);
    expect(send).not.toHaveBeenCalled();
  });
  it("keeps permanent rejections visible and caps transient retries", async () => {
    await saveInquiry(database.db, input(), config);
    const send = vi.fn().mockResolvedValue({ status: "failed", error: "provider_http_422" });
    expect((await drainEmail(database.db, "key", send)).failed).toBe(2);
    expect((await database.db.select().from(inquiry))).toHaveLength(1);
    await database.db.update(emailJob).set({ status: "pending", attempts: 7, availableAt: new Date(0) });
    send.mockResolvedValue({ status: "retry", error: "provider_unreachable" });
    expect((await drainEmail(database.db, "key", send)).review).toBe(2);
  });
});
