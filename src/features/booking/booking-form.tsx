"use client";
import { useEffect, useRef, useState } from "react";
import { validateReservation, type ReservationInput } from "./reservation";
import styles from "./booking-form.module.css";

type Slot = { start: string; end: string };
type RequestInput = ReservationInput & { website: string };
const recoveryKey = "griffamdev-booking-attempt";
export function BookingForm({ slot, timeZone, onChangeTime }: { slot: Slot; timeZone: string; onChangeTime: () => void }) {
  const [review, setReview] = useState<RequestInput | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [receipt, setReceipt] = useState<{ joinUrl: string; emailQueued: boolean } | null>(null);
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const labelDate = new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "full" }).format(new Date(slot.start));
  const labelTime = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(slot.start));
  const label = `${labelDate}, ${labelTime}`;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(recoveryKey);
        if (!saved) return;
        const value = JSON.parse(saved) as RequestInput;
        const valid = validateReservation(value);
        if (valid && valid.start === slot.start && valid.timeZone === timeZone) {
          setReview({ ...valid, website: "" }); setAttempted(true);
        }
      } catch { sessionStorage.removeItem(recoveryKey); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slot.start, timeZone]);
  function prepare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const data = validateReservation({ id: crypto.randomUUID(), start: new Date(slot.start).toISOString().replace(".000Z", "Z"), timeZone, name: values.get("name"), email: values.get("email"), notes: values.get("notes") });
    if (!data) { setMessage("Check your name, email address, and project notes before continuing."); return; }
    setReview({ ...data, website: String(values.get("website") ?? "") }); setMessage(""); setAttempted(false); setCanEdit(false);
    heading.current?.focus();
  }
  async function confirm() {
    if (!review || submitting.current) return;
    submitting.current = true; setPending(true); setAttempted(true); setCanEdit(false); setMessage("");
    sessionStorage.setItem(recoveryKey, JSON.stringify(review));
    try {
      const response = await fetch("/api/booking/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(review), signal: AbortSignal.timeout(15_000) });
      const body = await response.json();
      if (response.status === 200 && body.status === "confirmed" && body.id === review.id && Date.parse(body.start) === Date.parse(slot.start) && Date.parse(body.end) === Date.parse(slot.end) && body.timeZone === timeZone && body.emailQueued === true) {
        const url = new URL(body.joinUrl);
        if (url.protocol !== "https:" || !(url.hostname === "zoom.us" || url.hostname.endsWith(".zoom.us")) || !/^\/j\/\d{9,15}$/.test(url.pathname) || !url.searchParams.get("pwd") || [...url.searchParams.keys()].some(key => key !== "pwd")) throw new Error("Invalid meeting link");
        setReceipt({ joinUrl: url.href, emailQueued: true }); sessionStorage.removeItem(recoveryKey);
      } else if (response.status === 202 && body.status === "pending" && body.id === review.id) {
        setMessage("Your booking is still processing and is not confirmed yet. Retry this same request to check again; do not submit a second booking.");
      } else {
        setCanEdit(response.status === 409 || response.status === 400);
        setMessage(typeof body.error === "string" ? body.error : "We could not confirm this booking. Retry the same request below.");
      }
    } catch { setMessage("We could not verify whether your booking completed. Keep this page open and retry the same request below."); }
    finally { submitting.current = false; setPending(false); heading.current?.focus(); }
  }
  return <section className={styles.panel} aria-label="Book a discovery call">
    <h2 ref={heading} tabIndex={-1}>{receipt ? "Your call is confirmed" : review ? "Review your discovery call" : "Your details"}</h2>
    <p><strong>{label}</strong><br />{timeZone.replaceAll("_", " ")} · 30 minutes · Free · Zoom</p>
    {receipt && review ? <div role="status">
      <p>Thanks, {review.name}. Your call with Enoch Griffith is booked.</p>
      <a className="button" href={receipt.joinUrl} target="_blank" rel="noopener noreferrer">Open your Zoom meeting</a>
      <p>{receipt.emailQueued ? `A confirmation email with the meeting link is queued for ${review.email}.` : "Save your meeting link and booking reference."}</p>
      <p className={styles.reference}>Booking reference: {review.id}</p>
    </div> : <>
      <form onSubmit={prepare} hidden={!!review}>
        <div className="form-field"><label htmlFor="booking-name">Name</label><input id="booking-name" name="name" autoComplete="name" minLength={2} maxLength={100} required /></div>
        <div className="form-field"><label htmlFor="booking-email">Email address</label><input id="booking-email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
        <div className="form-field"><label htmlFor="booking-notes">What would you like to discuss? (optional)</label><textarea id="booking-notes" name="notes" maxLength={2000} rows={4} /></div>
        <div className={styles.honeypot} aria-hidden="true"><label htmlFor="booking-website">Leave this field empty</label><input id="booking-website" name="website" tabIndex={-1} autoComplete="off" /></div>
        <p>Your time is reserved only after confirmation.</p>
        <div className="actions"><button className="button" type="submit">Review booking</button><button className="button secondary" type="button" onClick={onChangeTime}>Choose another time</button></div>
      </form>
      {review && <>
        <dl className={styles.details}><dt>Name</dt><dd>{review.name}</dd><dt>Email</dt><dd>{review.email}</dd>{review.notes && <><dt>Project notes</dt><dd className={styles.notes}>{review.notes}</dd></>}</dl>
        {attempted && <p className={styles.reference}>Booking reference: {review.id}</p>}
        <div className="actions">
          <button className="button" disabled={pending} onClick={confirm}>{pending ? "Confirming your call…" : attempted ? "Retry same booking" : "Confirm free call"}</button>
          {(!attempted || canEdit) && <button className="button secondary" disabled={pending} onClick={() => { sessionStorage.removeItem(recoveryKey); setReview(null); setMessage(""); }}>Edit details</button>}
          {canEdit && <button className="button secondary" onClick={onChangeTime}>Refresh and choose another time</button>}
        </div>
      </>}
      {message && <p role="alert">{message}</p>}
    </>}
  </section>;
}
