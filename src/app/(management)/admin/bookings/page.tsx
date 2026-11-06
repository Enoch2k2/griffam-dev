import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { bookingReservation } from "@/server/db/schema";
import { BookingRecovery } from "@/features/booking/booking-recovery";
import styles from "@/features/booking/bookings-admin.module.css";
export const metadata = { title: "Bookings" };
export default function Page() { return <Suspense fallback={<p role="status">Loading bookings…</p>}><Bookings /></Suspense>; }
async function Bookings() {
  if ((await getAdminAccess(await headers())).status !== "authorized") redirect("/admin/sign-in");
  const rows = await getDatabase().select({ id: bookingReservation.id, name: bookingReservation.name, email: bookingReservation.email, notes: bookingReservation.notes, startsAt: bookingReservation.startsAt, endsAt: bookingReservation.endsAt, timeZone: bookingReservation.timeZone, status: bookingReservation.status, provisioningAt: bookingReservation.provisioningAt, zoomMeetingId: bookingReservation.zoomMeetingId, zoomJoinUrl: bookingReservation.zoomJoinUrl, googleEventId: bookingReservation.googleEventId, lastError: bookingReservation.lastError,
    recoverable: sql<boolean>`${bookingReservation.status} = 'needs_review' or (${bookingReservation.status} = 'provisioning' and ${bookingReservation.provisioningAt} < clock_timestamp() - interval '5 minutes')`,
  }).from(bookingReservation).orderBy(desc(bookingReservation.createdAt)).limit(50);
  return <div className="shell"><main id="main"><section className="page-section">
    <Link href="/admin">← Administration</Link><p className="eyebrow">Owner bookings</p><h1>Discovery calls.</h1>
    <p className="lead">Your latest 50 booking requests. Only confirmed calls are ready to join.</p>
    <p>Requests awaiting recovery keep the time blocked so another visitor cannot book over an uncertain meeting.</p>
    {rows.length === 0 && <p>No booking requests yet.</p>}
    <div className={styles.list}>{rows.map(row => {
      const date = new Intl.DateTimeFormat("en-US", { timeZone: row.timeZone, dateStyle: "full", timeStyle: "short" });
      return <article className={styles.card} key={row.id}>
        <p className="eyebrow">{row.status.replaceAll("_", " ")}{(row.status === "held" || row.status === "provisioning" || row.status === "needs_review") && " · Not confirmed"}</p>
        <h2>{row.name}</h2><p><a href={`mailto:${encodeURIComponent(row.email)}`}>{row.email}</a></p>
        <p><time dateTime={row.startsAt.toISOString()}>{date.format(row.startsAt)}</time><br />{row.timeZone} · 30-minute Zoom call</p>
        {row.notes && <p className={styles.notes}>{row.notes}</p>}
        <p className={styles.reference}>Booking reference: {row.id}</p>
        {row.status === "confirmed" && row.zoomJoinUrl && <a className="button secondary" href={row.zoomJoinUrl} target="_blank" rel="noopener noreferrer">Open Zoom meeting</a>}
        {row.lastError && <p className="form-help">Last result: {row.lastError}</p>}
        {row.recoverable && <BookingRecovery id={row.id} hasMeeting={!!row.zoomMeetingId} />}
      </article>;
    })}</div>
  </section></main></div>;
}
