import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gte, lt, or, sql } from "drizzle-orm";
import type { ReservationInput } from "@/features/booking/reservation";
import type { Database } from "@/server/db/connection";
import { bookingReservation as table } from "@/server/db/schema";
import { readBusy } from "@/server/calendar/google";
import { ensureCalendarEvent } from "@/server/calendar/events";
import { enqueueBookingEmails } from "@/server/email/booking";
import { scheduleBookingEmails } from "@/server/email/immediate";
import { createZoomMeeting, getZoomMeeting } from "@/server/zoom/meetings";
import type { readBookingRuntime } from "./readiness";
import { holdReservation } from "./reservations";
import { createBookingManagementToken } from "./management-token";

type Runtime = NonNullable<Awaited<ReturnType<typeof readBookingRuntime>>>;
type Dependencies = {
  readBusy: typeof readBusy;
  createZoomMeeting: typeof createZoomMeeting;
  getZoomMeeting: typeof getZoomMeeting;
  ensureCalendarEvent: typeof ensureCalendarEvent;
  scheduleBookingEmails: typeof scheduleBookingEmails;
};
const defaults: Dependencies = { readBusy, createZoomMeeting, getZoomMeeting, ensureCalendarEvent, scheduleBookingEmails };
const pending = (id: string) => ({ status: "pending" as const, id, message: "This booking is not confirmed yet. Its time remains blocked while the owner reviews it." });

async function row(db: Database, id: string) {
  const [reservation] = await db.select().from(table).where(eq(table.id, id));
  return reservation ?? null;
}

async function claim(db: Database, id: string, recovery = false) {
  const token = randomUUID();
  const eligible = recovery
    ? or(eq(table.status, "needs_review"), and(eq(table.status, "provisioning"), lt(table.provisioningAt, sql`now() - interval '5 minutes'`)))
    : and(eq(table.status, "held"), gte(table.expiresAt, sql`clock_timestamp()`));
  const [claimed] = await db.update(table).set({ status: "provisioning", provisioningToken: token, provisioningAt: sql`now()`, lastError: null })
    .where(and(eq(table.id, id), eligible)).returning();
  return claimed ? { reservation: claimed, token } : null;
}

async function markReview(db: Database, id: string, token: string, code: string) {
  await db.update(table).set({ status: "needs_review", lastError: code })
    .where(and(eq(table.id, id), eq(table.status, "provisioning"), eq(table.provisioningToken, token)));
}

async function persistZoom(db: Database, id: string, token: string, meeting: { id: string; joinUrl: string }) {
  return (await db.update(table).set({ zoomMeetingId: meeting.id, zoomJoinUrl: meeting.joinUrl })
    .where(and(eq(table.id, id), eq(table.status, "provisioning"), eq(table.provisioningToken, token)))
    .returning({ id: table.id })).length === 1;
}

async function persistCalendar(db: Database, id: string, token: string, eventId: string) {
  return (await db.update(table).set({ googleEventId: eventId })
    .where(and(eq(table.id, id), eq(table.status, "provisioning"), eq(table.provisioningToken, token)))
    .returning({ id: table.id })).length === 1;
}

async function finalize(db: Database, id: string, token: string, runtime: Runtime, deps: Dependencies) {
  const confirmed = await db.transaction(async tx => {
    const [current] = await tx.select().from(table).where(and(eq(table.id, id), eq(table.status, "provisioning"), eq(table.provisioningToken, token))).for("update");
    if (!current?.zoomMeetingId || !current.zoomJoinUrl || !current.googleEventId) return null;
    const management = createBookingManagementToken();
    await enqueueBookingEmails(tx, { id, email: current.email, start: current.startsAt.toISOString(), end: current.endsAt.toISOString(), timeZone: current.timeZone, joinUrl: current.zoomJoinUrl, managementUrl: `${runtime.email.origin}/booking/manage#token=${management.token}` }, runtime.email);
    const [saved] = await tx.update(table).set({ status: "confirmed", confirmedAt: sql`now()`, expiresAt: current.endsAt, lastError: null, managementTokenHash: management.hash, managementTokenExpiresAt: current.endsAt })
      .where(and(eq(table.id, id), eq(table.status, "provisioning"), eq(table.provisioningToken, token))).returning();
    return saved ?? null;
  });
  if (!confirmed) return pending(id);
  deps.scheduleBookingEmails(id);
  return { status: "confirmed" as const, id, start: confirmed.startsAt.toISOString(), end: confirmed.endsAt.toISOString(), timeZone: confirmed.timeZone, joinUrl: confirmed.zoomJoinUrl!, emailQueued: true };
}

async function provision(db: Database, claimed: NonNullable<Awaited<ReturnType<typeof claim>>>, runtime: Runtime, deps: Dependencies, adopted?: { id: string; joinUrl: string }) {
  const { reservation, token } = claimed;
  const slot = { id: reservation.id, start: reservation.startsAt.toISOString(), end: reservation.endsAt.toISOString() };
  let meeting = adopted;
  if (!meeting && reservation.zoomMeetingId) {
    try { meeting = await deps.getZoomMeeting(runtime.zoom, reservation.zoomMeetingId, slot); }
    catch { await markReview(db, reservation.id, token, "zoom_verification_failed"); return pending(reservation.id); }
  }
  if (!meeting) {
    try { meeting = await deps.createZoomMeeting(runtime.zoom, slot); }
    catch { await markReview(db, reservation.id, token, "zoom_create_uncertain"); return pending(reservation.id); }
  }
  try {
    if (!await persistZoom(db, reservation.id, token, meeting)) return pending(reservation.id);
    const event = await deps.ensureCalendarEvent(runtime.calendar, runtime.refreshToken, {
      ...slot, joinUrl: meeting.joinUrl,
      name: reservation.name, email: reservation.email, notes: reservation.notes, timeZone: reservation.timeZone,
    });
    if (!await persistCalendar(db, reservation.id, token, event.id)) return pending(reservation.id);
    return await finalize(db, reservation.id, token, runtime, deps);
  } catch {
    await markReview(db, reservation.id, token, "calendar_or_confirmation_failed");
    return pending(reservation.id);
  }
}

export async function confirmReservation(db: Database, input: ReservationInput, runtime: Runtime, dependencies: Partial<Dependencies> = {}) {
  const deps = { ...defaults, ...dependencies };
  const held = await holdReservation(db, input, (start, end) => deps.readBusy(runtime.calendar, runtime.refreshToken, start, end));
  if (held.status === "invalid") return { status: "invalid" as const };
  if (held.status === "id_conflict") return { status: "conflict" as const };
  if (held.status === "expired" || held.status === "unavailable") return { status: "unavailable" as const };
  if (held.status === "limited") return { status: "limited" as const };
  if (held.status === "existing") {
    const existing = await row(db, input.id);
    if (!existing) return pending(input.id);
    if (existing.status === "confirmed" && existing.zoomJoinUrl) return { status: "confirmed" as const, id: existing.id, start: existing.startsAt.toISOString(), end: existing.endsAt.toISOString(), timeZone: existing.timeZone, joinUrl: existing.zoomJoinUrl, emailQueued: true };
    if (existing.status !== "held") return pending(input.id);
  }
  const claimed = await claim(db, input.id);
  return claimed ? provision(db, claimed, runtime, deps) : pending(input.id);
}

export async function recoverReservation(db: Database, input: { id: string; action: "resume" | "adopt" | "release"; meetingId?: string; acknowledged?: boolean }, runtime: Runtime, dependencies: Partial<Dependencies> = {}) {
  const deps = { ...defaults, ...dependencies };
  const existing = await row(db, input.id);
  if (!existing || existing.status === "confirmed" || existing.status === "cancelled") return { status: "conflict" as const };
  if (input.action === "release") {
    if (!input.acknowledged) return { status: "invalid" as const };
    const eligible = or(eq(table.status, "needs_review"), and(eq(table.status, "provisioning"), lt(table.provisioningAt, sql`now() - interval '5 minutes'`)));
    const [released] = await db.update(table).set({ status: "cancelled", provisioningToken: randomUUID(), lastError: "owner_released_after_cleanup" })
      .where(and(eq(table.id, input.id), eligible)).returning({ id: table.id });
    return released ? { status: "cancelled" as const, id: input.id } : { status: "conflict" as const };
  }
  const claimed = await claim(db, input.id, true);
  if (!claimed) return pending(input.id);
  const slot = { id: existing.id, start: existing.startsAt.toISOString(), end: existing.endsAt.toISOString() };
  if (input.action === "resume") {
    if (!existing.zoomMeetingId) { await markReview(db, input.id, claimed.token, "zoom_meeting_missing"); return { status: "invalid" as const }; }
    return provision(db, { ...claimed, reservation: { ...claimed.reservation, zoomMeetingId: existing.zoomMeetingId } }, runtime, deps);
  }
  if (!input.meetingId || !/^\d{9,15}$/.test(input.meetingId) || existing.zoomMeetingId) { await markReview(db, input.id, claimed.token, "adoption_invalid"); return { status: "invalid" as const }; }
  try {
    const meeting = await deps.getZoomMeeting(runtime.zoom, input.meetingId, slot);
    return provision(db, claimed, runtime, deps, meeting);
  } catch { await markReview(db, input.id, claimed.token, "zoom_adoption_failed"); return pending(input.id); }
}
