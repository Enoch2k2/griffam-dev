import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/server/db/connection";
import { bookingReservation, emailJob } from "../../src/server/db/schema";
import { confirmReservation, recoverReservation } from "../../src/server/booking/confirmation";
import { takeBookingRequest } from "../../src/server/booking/request-budget";
import { saveSettings } from "../../src/server/booking/settings";
import { candidateSlots, initialSettings } from "../../src/features/booking/availability";

const testURL = process.env.TEST_DATABASE_URL;
if (process.env.CI && !testURL) throw new Error("CI requires TEST_DATABASE_URL");
describe.skipIf(!testURL)("booking confirmation orchestration", () => {
  let control: Pool;
  let database: ReturnType<typeof createDatabase>;
  let start: string;
  const name = `griffamdev_confirmation_${randomUUID().replaceAll("-", "")}`;
  const runtime = {
    calendar: {}, refreshToken: "refresh", zoom: {},
    email: { apiKey: "key", from: "hello@example.com", owner: "owner@example.com", origin: "https://example.com" },
  } as never;
  const input = () => ({ id: randomUUID(), start, name: "Test Client", email: "client@example.com", timeZone: "America/Chicago", notes: "Planning" });
  const meeting = (id = "12345678901") => ({ id, joinUrl: `https://zoom.us/j/${id}?pwd=participant` });
  const dependencies = () => ({ readBusy: vi.fn(async () => []), createZoomMeeting: vi.fn(async () => meeting()), getZoomMeeting: vi.fn(async () => meeting()), ensureCalendarEvent: vi.fn(async () => ({ id: "google-event" })), scheduleBookingEmails: vi.fn() });
  beforeAll(async () => {
    const url = new URL(testURL!);
    if (!url.pathname.endsWith("_test")) throw new Error("Use a dedicated _test database.");
    control = new Pool({ connectionString: testURL }); await control.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`; database = createDatabase(url.toString());
    await migrate(database.db, { migrationsFolder: "./drizzle" }); await migrate(database.db, { migrationsFolder: "./drizzle" });
    await saveSettings(database.db, initialSettings);
    start = candidateSlots(initialSettings, new Date(Date.now() + 86400000).toISOString(), 20, [])[0].start;
  });
  beforeEach(async () => { await database.pool.query("truncate email_job, booking_reservation, booking_request_limit"); });
  afterAll(async () => { await database?.pool.end(); if (control) { await control.query(`DROP DATABASE IF EXISTS "${name}"`); await control.end(); } });

  it("confirms once, persists both provider identities, atomically enqueues two emails and makes retries read-only", async () => {
    const data = input(); const deps = dependencies();
    const first = await confirmReservation(database.db, data, runtime, deps);
    expect(first).toMatchObject({ status: "confirmed", id: data.id, emailQueued: true });
    expect(deps.ensureCalendarEvent).toHaveBeenCalledWith({}, "refresh", expect.objectContaining({ name: data.name, email: data.email, notes: data.notes, timeZone: data.timeZone, joinUrl: meeting().joinUrl }));
    expect(deps.createZoomMeeting).toHaveBeenCalledOnce(); expect(deps.ensureCalendarEvent).toHaveBeenCalledOnce(); expect(deps.scheduleBookingEmails).toHaveBeenCalledOnce();
    const [saved] = await database.db.select().from(bookingReservation).where(eq(bookingReservation.id, data.id));
    expect(saved).toMatchObject({ status: "confirmed", zoomMeetingId: "12345678901", googleEventId: "google-event", managementTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), managementTokenExpiresAt: saved.endsAt });
    expect(await database.db.select().from(emailJob)).toHaveLength(2);
    const retry = await confirmReservation(database.db, data, runtime, deps);
    expect(retry).toMatchObject({ status: "confirmed", id: data.id });
    expect(deps.createZoomMeeting).toHaveBeenCalledOnce(); expect(await database.db.select().from(emailJob)).toHaveLength(2);
  });

  it("allows only one provisioner for concurrent duplicate submissions", async () => {
    const data = input(); const deps = dependencies();
    const results = await Promise.all([confirmReservation(database.db, data, runtime, deps), confirmReservation(database.db, data, runtime, deps)]);
    expect(results.some(result => result.status === "confirmed")).toBe(true);
    expect(results.every(result => result.status === "confirmed" || result.status === "pending")).toBe(true);
    expect(deps.createZoomMeeting).toHaveBeenCalledOnce();
  });

  it("never retries an uncertain Zoom create and requires owner adoption or review", async () => {
    const data = input(); const deps = dependencies(); deps.createZoomMeeting.mockRejectedValue(new Error("timeout"));
    expect(await confirmReservation(database.db, data, runtime, deps)).toMatchObject({ status: "pending" });
    expect((await database.db.select().from(bookingReservation))[0]).toMatchObject({ status: "needs_review", lastError: "zoom_create_uncertain" });
    expect(await confirmReservation(database.db, data, runtime, deps)).toMatchObject({ status: "pending" });
    expect(deps.createZoomMeeting).toHaveBeenCalledOnce();
  });

  it("persists Zoom before Calendar and resumes deterministically without creating a second Zoom meeting", async () => {
    const data = input(); const deps = dependencies(); deps.ensureCalendarEvent.mockRejectedValueOnce(new Error("calendar"));
    expect(await confirmReservation(database.db, data, runtime, deps)).toMatchObject({ status: "pending" });
    expect((await database.db.select().from(bookingReservation))[0]).toMatchObject({ status: "needs_review", zoomMeetingId: "12345678901", googleEventId: null });
    const recovered = await recoverReservation(database.db, { id: data.id, action: "resume" }, runtime, deps);
    expect(recovered).toMatchObject({ status: "confirmed" });
    expect(deps.ensureCalendarEvent).toHaveBeenLastCalledWith({}, "refresh", expect.objectContaining({ name: data.name, email: data.email, notes: data.notes, timeZone: data.timeZone }));
    expect(deps.createZoomMeeting).toHaveBeenCalledOnce(); expect(deps.getZoomMeeting).toHaveBeenCalledOnce(); expect(deps.ensureCalendarEvent).toHaveBeenCalledTimes(2);
  });

  it("fences a late provisioner after acknowledged owner cleanup releases a stale request", async () => {
    const data = input(); const deps = dependencies();
    let resolve!: (value: { id: string; joinUrl: string }) => void;
    deps.createZoomMeeting.mockImplementation(() => new Promise(done => { resolve = done; }));
    const running = confirmReservation(database.db, data, runtime, deps);
    while (!(await database.db.select().from(bookingReservation))[0]?.provisioningToken) await new Promise(done => setTimeout(done, 5));
    await database.pool.query("update booking_reservation set provisioning_at = now() - interval '6 minutes'");
    expect(await recoverReservation(database.db, { id: data.id, action: "release", acknowledged: true }, runtime, deps)).toMatchObject({ status: "cancelled" });
    resolve(meeting());
    expect(await running).toMatchObject({ status: "pending" });
    expect((await database.db.select().from(bookingReservation))[0]).toMatchObject({ status: "cancelled", confirmedAt: null });
    expect(await database.db.select().from(emailJob)).toHaveLength(0);
  });
  it("enforces and reuses one bounded database request-budget bucket", async () => {
    for (let count = 0; count < 20; count++) expect(await takeBookingRequest(database.db)).toBe(true);
    expect(await takeBookingRequest(database.db)).toBe(false);
    expect((await database.pool.query("select attempts from booking_request_limit")).rows).toEqual([{ attempts: 21 }]);
  });
});
