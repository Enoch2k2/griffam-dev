"use client";
import { useRef, useState } from "react";
export function BookingRecovery({ id, hasMeeting }: { id: string; hasMeeting: boolean }) {
  const [meetingId, setMeetingId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  async function recover(action: "resume" | "adopt" | "release") {
    if (inFlight.current || done) return;
    inFlight.current = true; setPending(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/bookings/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, ...(action === "adopt" ? { meetingId: meetingId.trim() } : {}), ...(action === "release" ? { acknowledged } : {}) }) });
      const body = await response.json();
      if (response.status === 200 && (body.status === "confirmed" || body.status === "cancelled")) {
        setDone(true); setMessage(body.status === "confirmed" ? "Booking confirmed. Reload this page to see the meeting details." : "Booking cancelled and its time released. Reload this page to update the list.");
      } else if (response.status === 202) setMessage("Recovery is still pending. The time remains blocked; reload this page before taking further action.");
      else { setError(true); setMessage(typeof body.error === "string" ? body.error : "Recovery could not be completed. Reload to check the current booking status."); }
    } catch { setError(true); setMessage("The result could not be verified. Reload to check the booking before taking further action."); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <div aria-label={`Recovery for booking ${id}`}>
    <h3>Review this booking</h3>
    <p>This call is not confirmed. Its time stays blocked until recovery is resolved. Check Zoom for the booking reference in the meeting agenda before taking action; do not create another meeting blindly.</p>
    {!done && <>
      {hasMeeting ? <button className="button secondary" disabled={pending} onClick={() => recover("resume")}>Resume calendar sync</button> : <form onSubmit={event => { event.preventDefault(); void recover("adopt"); }}>
        <div className="form-field"><label htmlFor={`meeting-${id}`}>Existing Zoom meeting ID</label><input id={`meeting-${id}`} value={meetingId} onChange={event => setMeetingId(event.target.value)} inputMode="numeric" pattern="[0-9]{9,15}" required disabled={pending} /><p className="form-help">Use the numeric meeting ID, without spaces, for the meeting matching this booking’s agenda reference.</p></div>
        <button className="button secondary" disabled={pending} type="submit">Use existing Zoom meeting</button>
      </form>}
      <div style={{ marginTop: "1.5rem" }}>
        <label><input type="checkbox" checked={acknowledged} disabled={pending} onChange={event => setAcknowledged(event.target.checked)} /> I checked Zoom and Google Calendar and removed any meeting/event for this booking.</label>
        <div className="actions"><button className="button secondary" disabled={pending || !acknowledged} onClick={() => recover("release")}>Cancel booking and release time</button></div>
      </div>
    </>}
    {pending && <p role="status">Processing recovery…</p>}
    {message && <p role={error ? "alert" : "status"}>{message}</p>}
  </div>;
}
