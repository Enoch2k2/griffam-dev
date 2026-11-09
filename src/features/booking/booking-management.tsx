"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ManagedBooking = { start: string; end: string; timeZone: string; status: string; cancellable: boolean };
export function BookingManagement() {
  const token = useRef("");
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    // Email links keep the capability in a URL fragment so it is not sent to
    // server logs or referrers. Remove it from browser history before lookup.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const capability = fragment.get("token") ?? "";
    window.history.replaceState(null, "", "/booking/manage");
    token.current = capability;
    let active = true;
    fetch("/api/booking/manage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: capability, action: "read" }), cache: "no-store",
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Booking details are unavailable.");
        return data.booking as ManagedBooking;
      })
      .then(data => { if (active) setBooking(data); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Booking details are unavailable."); });
    return () => { active = false; };
  }, []);

  async function cancel() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/booking/manage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.current, action: "cancel" }), cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(data.error || "Cancellation could not be completed.");
      if (response.status === 202) throw new Error(data.error);
      setDone(true);
      setBooking(current => current ? { ...current, status: "cancelled", cancellable: false } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Cancellation could not be completed.");
    } finally { setBusy(false); }
  }

  const date = booking ? new Intl.DateTimeFormat("en-US", { timeZone: booking.timeZone, dateStyle: "full" }).format(new Date(booking.start)) : "";
  const time = booking ? new Intl.DateTimeFormat("en-US", { timeZone: booking.timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null;

  return <section className="page-section booking-management">
    <p className="eyebrow">Your booking</p>
    <h1>Manage your discovery call.</h1>
    {booking ? <>
      <div className="booking-management-card">
        <p><strong>{date}</strong></p>
        <p>{time?.format(new Date(booking.start))} – {time?.format(new Date(booking.end))}</p>
        <p>Free 30-minute GriffamDev call · {booking.timeZone.replaceAll("_", " ")}</p>
        {booking.status === "cancelled" || done ? <p role="status">This call has been cancelled. A confirmation email is on its way.</p>
          : booking.status === "cancellation_pending" ? <>
            <p role="status">Your cancellation needs another check to finish.</p>
            <button className="button secondary" type="button" disabled={busy} onClick={() => void cancel()}>{busy ? "Checking cancellation…" : "Retry cancellation"}</button>
          </>
          : booking.cancellable ? <>
            <p>Online cancellation is available until 24 hours before your call.</p>
            {confirming ? <>
              <p>Confirm cancellation of this call, Zoom meeting, and Calendar invitation?</p>
              <button className="button secondary" type="button" disabled={busy} onClick={() => void cancel()}>{busy ? "Cancelling…" : "Confirm cancellation"}</button>
              <button className="button secondary" type="button" disabled={busy} onClick={() => setConfirming(false)}>Keep my call</button>
            </> : <button className="button secondary" type="button" disabled={busy} onClick={() => setConfirming(true)}>Cancel this call</button>}
          </> : <p>Online cancellation is available until 24 hours before your call. <Link href="/contact">Contact GriffamDev</Link> if you need help.</p>}
      </div>
    </> : error ? <p role="alert">{error}</p> : <p role="status">Loading your booking…</p>}
    {error && booking && <p role="alert">{error}</p>}
    <div className="actions"><Link className="button secondary" href="/book">Book another call</Link></div>
  </section>;
}
