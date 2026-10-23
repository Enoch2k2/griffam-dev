"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { inquiryServices, validateInquiry, type InquiryErrors } from "./validation";

export function InquiryForm() {
  const [pending, setPending] = useState(false);
  const [emailQueued, setEmailQueued] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<InquiryErrors>({});
  const feedback = useRef<HTMLDivElement>(null);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  useEffect(() => { if (notice || saved) feedback.current?.focus(); }, [notice, saved]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const fields = Object.fromEntries(form.entries());
    const payload = JSON.stringify(fields);
    if (!attempt.current || attempt.current.payload !== payload) attempt.current = { payload, id: crypto.randomUUID() };
    const input = { ...fields, id: attempt.current.id };
    const validation = validateInquiry(input);
    if (!validation.ok) {
      setErrors(validation.errors);
      setNotice("Please check the highlighted fields.");
      return;
    }
    setErrors({}); setNotice(""); setPending(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input), signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json();
      if (!response.ok) {
        setNotice(result.error || "Your inquiry could not be sent. Please try again.");
        setErrors(result.errors || {});
      } else if (result.status === "saved") {
        setEmailQueued(result.emailQueued === true);
        setSaved(true);
      } else {
        setNotice("We couldn't confirm your inquiry was saved. Please try again.");
      }
    } catch {
      setNotice("We couldn't confirm your inquiry was saved. Your message is still here; please try again.");
    } finally { setPending(false); }
  }
  if (saved) return (
    <div className="inquiry-feedback" ref={feedback} tabIndex={-1} role="status">
      <h2>Your inquiry is saved.</h2>
      <p>Enoch can review it in his private inbox and reply using the email address you provided.</p>
      <p>No appointment has been booked. {emailQueued ? "A receipt email is queued for the address you provided. Delivery may take a little while." : "Email receipts are not enabled for this submission."}</p>
    </div>
  );
  return (
    <form className="inquiry-form" onSubmit={submit} noValidate aria-busy={pending}>
      {notice && <div className="inquiry-feedback" ref={feedback} tabIndex={-1} role="alert">{notice}</div>}
      <fieldset disabled={pending}>
        <legend className="sr-only">Tell me about your project</legend>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="inquiry-name">Name <span>(required)</span></label>
            <input id="inquiry-name" name="name" autoComplete="name" required minLength={2} maxLength={100} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
            {errors.name && <p id="name-error" className="field-error">{errors.name}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="inquiry-email">Email <span>(required)</span></label>
            <input id="inquiry-email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
            {errors.email && <p id="email-error" className="field-error">{errors.email}</p>}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="inquiry-service">Project type <span>(required)</span></label>
          <select id="inquiry-service" name="service" defaultValue="Not sure yet" aria-invalid={Boolean(errors.service)} aria-describedby={errors.service ? "service-error" : undefined}>
            {inquiryServices.map(service => <option key={service}>{service}</option>)}
          </select>
          {errors.service && <p id="service-error" className="field-error">{errors.service}</p>}
        </div>
        <div className="form-field">
          <label htmlFor="inquiry-message">What would you like to build? <span>(required)</span></label>
          <p id="message-help" className="form-help">Share the problem, who it affects, and any timing or scope you have in mind. Please leave out passwords and confidential information.</p>
          <textarea id="inquiry-message" name="message" rows={7} required minLength={20} maxLength={4000} aria-invalid={Boolean(errors.message)} aria-describedby={`message-help${errors.message ? " message-error" : ""}`} />
          {errors.message && <p id="message-error" className="field-error">{errors.message}</p>}
        </div>
        <div className="inquiry-trap" aria-hidden="true">
          <label htmlFor="inquiry-website">Leave this field empty</label>
          <input id="inquiry-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <p className="form-help">Your name, email, and message are stored privately so Enoch can respond to your inquiry. This does not subscribe you to marketing or book a call.</p>
        <button className="button" type="submit">{pending ? "Saving inquiry…" : "Send project inquiry"}</button>
      </fieldset>
    </form>
  );
}
