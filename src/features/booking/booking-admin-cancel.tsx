"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function BookingAdminCancel({ id, retry = false }: { id: string; retry?: boolean }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function cancel() {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/bookings/cancel", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      const body = await response.json();
      if (response.status === 200 && body.status === "cancelled" && body.id === id) {
        setMessage("Booking cancelled. The client has been emailed.");
        setConfirming(false);
        router.refresh();
      } else if (response.status === 202 && body.status === "pending" && body.id === id) {
        setMessage("Cancellation is still being finalized. The booking remains blocked; retry after checking the refreshed status.");
        setConfirming(false);
        router.refresh();
      } else {
        setError(true);
        setMessage(typeof body.error === "string" ? body.error : "Cancellation could not be verified. Refresh the list before trying again.");
      }
    } catch {
      setError(true);
      setMessage("Cancellation could not be verified. Refresh the list before trying again.");
    } finally { inFlight.current = false; setPending(false); }
  }

  return <div>
    {!confirming ? <button className="button secondary" type="button" disabled={pending} onClick={() => { setMessage(""); setError(false); setConfirming(true); }}>{retry ? "Retry cancellation" : "Cancel booking"}</button> : <div role="group" aria-label="Confirm booking cancellation">
      <p>{retry ? "Retry cancellation of this booking’s Zoom meeting and Calendar event?" : "Cancel this booking’s Zoom meeting and Calendar event, and email the client?"}</p>
      <div className="actions">
        <button className="button secondary" type="button" disabled={pending} onClick={() => void cancel()}>{pending ? "Cancelling…" : "Confirm cancellation"}</button>
        <button className="button secondary" type="button" disabled={pending} onClick={() => setConfirming(false)}>Keep booking</button>
      </div>
    </div>}
    {message && <p role={error ? "alert" : "status"}>{message}</p>}
  </div>;
}
