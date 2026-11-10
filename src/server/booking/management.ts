import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { isValidBookingManagementToken, hashBookingManagementToken } from "./management-token";
import type { Database } from "@/server/db/connection";
import { bookingReservation, emailJob } from "@/server/db/schema";
import { enqueueBookingCancellation } from "@/server/email/booking";
import type { EmailConfig } from "@/server/email/config";
import type { CalendarConfig } from "@/server/calendar/config";
import type { ZoomConfig } from "@/server/zoom/meetings";
import { cancelCalendarEvent } from "@/server/calendar/events";
import { cancelZoomMeeting } from "@/server/zoom/meetings";

export type ManagementRuntime = { email: EmailConfig; calendar: CalendarConfig; refreshToken: string; zoom: ZoomConfig };
type CancelDependencies = {
  cancelCalendarEvent: typeof cancelCalendarEvent;
  cancelZoomMeeting: typeof cancelZoomMeeting;
};
const defaults: CancelDependencies = { cancelCalendarEvent, cancelZoomMeeting };

async function findReservation(db: Database, token: unknown) {
  if (!isValidBookingManagementToken(token)) return null;
  const hash = hashBookingManagementToken(token);
  const [row] = await db.select().from(bookingReservation).where(and(
    eq(bookingReservation.managementTokenHash, hash),
    gte(bookingReservation.managementTokenExpiresAt, sql`now()`),
  ));
  return row ?? null;
}

type Reservation = NonNullable<Awaited<ReturnType<typeof findReservation>>>;

export async function readManagedBooking(db: Database, token: unknown) {
  const reservation = await findReservation(db, token);
  if (!reservation || !["confirmed", "cancellation_pending", "cancelled"].includes(reservation.status)) return null;
  return {
    id: reservation.id,
    start: reservation.startsAt.toISOString(),
    end: reservation.endsAt.toISOString(),
    timeZone: reservation.timeZone,
    status: reservation.status,
    cancellable: reservation.status === "confirmed" && reservation.startsAt.getTime() - Date.now() >= 24 * 60 * 60_000,
  };
}

export async function cancelManagedBooking(db: Database, token: unknown, runtime: ManagementRuntime, dependencies: Partial<CancelDependencies> = {}) {
  const reservation = await findReservation(db, token);
  if (!reservation) return { status: "invalid" as const };
  return cancelReservation(db, reservation, runtime, dependencies, true);
}

export async function cancelOwnerBooking(db: Database, id: string, runtime: ManagementRuntime, dependencies: Partial<CancelDependencies> = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "invalid" as const };
  const [reservation] = await db.select().from(bookingReservation).where(eq(bookingReservation.id, id));
  if (!reservation) return { status: "invalid" as const };
  return cancelReservation(db, reservation, runtime, dependencies, false);
}

async function cancelReservation(db: Database, reservation: Reservation, runtime: ManagementRuntime, dependencies: Partial<CancelDependencies>, enforceCutoff: boolean) {
  const deps = { ...defaults, ...dependencies };
  if (reservation.status === "cancelled") return { status: "cancelled" as const, id: reservation.id };
  if (!reservation.googleEventId || !reservation.zoomMeetingId) return { status: "invalid" as const };
  if (enforceCutoff && reservation.status === "confirmed" && reservation.startsAt.getTime() - Date.now() < 24 * 60 * 60_000) return { status: "cutoff" as const };
  if (reservation.status !== "confirmed" && reservation.status !== "cancellation_pending") {
    return { status: "invalid" as const };
  }

  // Commit an explicit pending state before provider calls. Retries can safely
  // finish either provider cancellation if the request or process is interrupted.
  if (reservation.status === "confirmed") {
    const eligibility = enforceCutoff
      ? and(eq(bookingReservation.status, "confirmed"), gte(bookingReservation.startsAt, sql`now() + interval '24 hours'`))
      : eq(bookingReservation.status, "confirmed");
    const [claimed] = await db.update(bookingReservation).set({ status: "cancellation_pending", lastError: "cancellation_in_progress" })
      .where(and(eq(bookingReservation.id, reservation.id), eligibility))
      .returning({ id: bookingReservation.id });
    if (!claimed) return { status: enforceCutoff ? "cutoff" as const : "conflict" as const };
  }

  try {
    await Promise.all([
      deps.cancelZoomMeeting(runtime.zoom, reservation.zoomMeetingId),
      deps.cancelCalendarEvent(runtime.calendar, runtime.refreshToken, reservation.googleEventId, reservation.id),
    ]);
  } catch {
    await db.update(bookingReservation).set({ lastError: "provider_cancellation_unverified" })
      .where(and(eq(bookingReservation.id, reservation.id), eq(bookingReservation.status, "cancellation_pending")));
    return { status: "pending" as const };
  }

  await db.transaction(async tx => {
    await tx.update(emailJob).set({ status: "cancelled", leaseToken: null, leaseUntil: null, lastError: "booking_cancelled" })
      .where(and(eq(emailJob.bookingId, reservation.id), eq(emailJob.status, "pending"), sql`${emailJob.kind} in ('booking-reminder', 'booking-confirmation')`));
    await tx.update(bookingReservation).set({ status: "cancelled", lastError: null })
      .where(and(eq(bookingReservation.id, reservation.id), eq(bookingReservation.status, "cancellation_pending")));
    await enqueueBookingCancellation(tx, { id: reservation.id, email: reservation.email, start: reservation.startsAt.toISOString(), timeZone: reservation.timeZone }, runtime.email);
  });
  return { status: "cancelled" as const, id: reservation.id };
}
