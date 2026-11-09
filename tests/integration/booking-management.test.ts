import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/server/db/connection";
import { bookingReservation, emailJob } from "../../src/server/db/schema";
import { cancelManagedBooking, readManagedBooking } from "../../src/server/booking/management";
import { createBookingManagementToken } from "../../src/server/booking/management-token";
import { enqueueBookingEmails } from "../../src/server/email/booking";

const testURL = process.env.TEST_DATABASE_URL;
if (process.env.CI && !testURL) throw new Error("CI requires TEST_DATABASE_URL");
describe.skipIf(!testURL)("client booking management", () => {
  let control: Pool;
  let database: ReturnType<typeof createDatabase>;
  const name = `griffamdev_management_${randomUUID().replaceAll("-", "")}`;
  const email = { apiKey: "key", from: "hello@example.com", owner: "owner@example.com", origin: "https://example.com" };
  const runtime = { email, calendar: {}, refreshToken: "refresh", zoom: {} } as never;
  const token = createBookingManagementToken();
  const id = randomUUID();
  const start = new Date(Date.now() + 48 * 60 * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000);

  beforeAll(async () => {
    const url = new URL(testURL!);
    if (!url.pathname.endsWith("_test")) throw new Error("Use a dedicated _test database.");
    control = new Pool({ connectionString: testURL }); await control.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`; database = createDatabase(url.toString());
    await migrate(database.db, { migrationsFolder: "./drizzle" }); await migrate(database.db, { migrationsFolder: "./drizzle" });
  });
  beforeEach(async () => {
    await database.pool.query("truncate email_job, booking_reservation");
    await database.db.insert(bookingReservation).values({
      id, requestHash: "test", name: "Client", email: "client@example.com", timeZone: "America/Chicago", notes: "",
      startsAt: start, endsAt: end, occupiedUntil: new Date(end.getTime() + 30 * 60_000), status: "confirmed", expiresAt: end,
      zoomMeetingId: "12345678901", zoomJoinUrl: "https://zoom.us/j/12345678901?pwd=participant", googleEventId: `gd${randomBytes(32).toString("hex")}`,
      confirmedAt: new Date(), managementTokenHash: token.hash, managementTokenExpiresAt: end,
    });
    await database.db.transaction(tx => enqueueBookingEmails(tx, {
      id, email: "client@example.com", start: start.toISOString(), end: end.toISOString(), timeZone: "America/Chicago",
      joinUrl: "https://zoom.us/j/12345678901?pwd=participant", managementUrl: `https://example.com/booking/manage?token=${token.token}`,
    }, email));
  });
  afterAll(async () => { await database?.pool.end(); if (control) { await control.query(`DROP DATABASE IF EXISTS "${name}"`); await control.end(); } });

  it("shows only a valid opaque token's booking details", async () => {
    expect(await readManagedBooking(database.db, token.token)).toMatchObject({ id, status: "confirmed", cancellable: true, timeZone: "America/Chicago" });
    expect(await readManagedBooking(database.db, "not-a-token")).toBeNull();
    expect(await readManagedBooking(database.db, "A".repeat(43))).toBeNull();
  });

  it("cancels both providers, cancels unsent client mail, and queues one cancellation notice", async () => {
    const dependencies = { cancelZoomMeeting: vi.fn(), cancelCalendarEvent: vi.fn() };
    expect(await cancelManagedBooking(database.db, token.token, runtime, dependencies)).toMatchObject({ status: "cancelled", id });
    expect(dependencies.cancelZoomMeeting).toHaveBeenCalledWith({}, "12345678901");
    expect(dependencies.cancelCalendarEvent).toHaveBeenCalledWith({}, "refresh", expect.stringMatching(/^gd/), id);
    expect((await database.db.select().from(bookingReservation).where(eq(bookingReservation.id, id)))[0].status).toBe("cancelled");
    const jobs = await database.db.select().from(emailJob).where(eq(emailJob.bookingId, id));
    expect(jobs.find(job => job.kind === "booking-reminder")?.status).toBe("cancelled");
    expect(jobs.find(job => job.kind === "booking-confirmation")?.status).toBe("cancelled");
    expect(jobs.find(job => job.kind === "booking-cancellation")?.payload.text).toContain("has been cancelled");
    expect(await cancelManagedBooking(database.db, token.token, runtime, dependencies)).toMatchObject({ status: "cancelled", id });
    expect(dependencies.cancelZoomMeeting).toHaveBeenCalledOnce();
    expect((await database.db.select().from(emailJob).where(eq(emailJob.bookingId, id))).filter(job => job.kind === "booking-cancellation")).toHaveLength(1);
  });

  it("keeps a partially cancelled booking recoverable and enforces the 24-hour cutoff", async () => {
    const failing = { cancelZoomMeeting: vi.fn(), cancelCalendarEvent: vi.fn().mockRejectedValueOnce(new Error("provider")) };
    expect(await cancelManagedBooking(database.db, token.token, runtime, failing)).toEqual({ status: "pending" });
    expect((await database.db.select().from(bookingReservation).where(eq(bookingReservation.id, id)))[0].status).toBe("cancellation_pending");
    const [pending] = await database.db.select().from(bookingReservation).where(eq(bookingReservation.id, id));
    await database.db.update(bookingReservation).set({ status: "confirmed", startsAt: new Date(Date.now() + 23 * 60 * 60_000) }).where(eq(bookingReservation.id, id));
    const blocked = { cancelZoomMeeting: vi.fn(), cancelCalendarEvent: vi.fn() };
    expect(await cancelManagedBooking(database.db, token.token, runtime, blocked)).toEqual({ status: "cutoff" });
    expect(blocked.cancelZoomMeeting).not.toHaveBeenCalled();
    expect(pending.status).toBe("cancellation_pending");
  });
});
