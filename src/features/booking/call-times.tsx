"use client";
import { useEffect, useState } from "react";
import { validateReservation } from "./reservation";
import { BookingForm } from "./booking-form";
type Slot = { start: string; end: string };
export function CallTimes({ timeZones }: { timeZones: string[] }) {
  const [selected, setSelected] = useState<Slot | null>(null);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [zone, setZone] = useState("America/Chicago");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const zones = Array.from(new Set([zone, "America/Chicago", ...timeZones]));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem("griffamdev-booking-attempt");
        if (!raw) return;
        const saved = validateReservation(JSON.parse(raw));
        if (!saved) { sessionStorage.removeItem("griffamdev-booking-attempt"); return; }
        setZone(saved.timeZone);
        setSelected({ start: saved.start, end: new Date(Date.parse(saved.start) + 30 * 60_000).toISOString() });
        setBookingEnabled(true);
      } catch { sessionStorage.removeItem("griffamdev-booking-attempt"); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function load() {
    setPending(true); setSlots(null); setBookingEnabled(false); setMessage("");
    try {
      const response = await fetch("/api/booking/availability", { cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json();
      if (!Array.isArray(data.slots) || data.slots.length > 500 || !Number.isInteger(data.days) || data.days < 1 || data.days > 31 || data.slots.some((value: unknown) => {
        const slot = value as Partial<Slot>;
        return typeof slot?.start !== "string" || typeof slot.end !== "string" || !Number.isFinite(Date.parse(slot.start)) || Date.parse(slot.end) - Date.parse(slot.start) !== 30 * 60_000;
      })) throw new Error("Invalid availability");
      setSlots(data.slots as Slot[]);
      setBookingEnabled(data.bookingEnabled === true);
      setMessage(data.slots.length ? `Showing available times over the next ${data.days} days.` : "No call times are available in this window. Please contact me to find a time.");
    } catch { setMessage("Call times are temporarily unavailable. Please try again or contact me."); }
    finally { setPending(false); }
  }
  const grouped = new Map<string, Slot[]>();
  const date = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  for (const slot of slots ?? []) {
    const label = date.format(new Date(slot.start));
    grouped.set(label, [...(grouped.get(label) ?? []), slot]);
  }
  if (selected) return <BookingForm slot={selected} timeZone={zone} onChangeTime={() => { setSelected(null); void load(); }} />;
  return <div className="call-times">
    <div className="form-field"><label htmlFor="booking-zone">Display time zone</label>
      <select id="booking-zone" value={zone} onChange={event => setZone(event.target.value)}>{zones.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
    </div>
    <div className="actions">
      <button className="button secondary" onClick={() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use my time zone</button>
      <button className="button" disabled={pending} onClick={load}>{pending ? "Checking calendar…" : slots ? "Refresh times" : "View available times"}</button>
    </div>
    <p role="status" aria-live="polite">{message}</p>
    {slots && <p>{bookingEnabled ? "Choose a time to review and book your free Zoom call." : "Online reservations are not available yet. Viewing a time does not reserve it."}</p>}
    <div className="call-days" aria-busy={pending}>{Array.from(grouped, ([label, values]) => <section className="call-day" key={label}>
      <h2>{label}</h2><ul>{values.map(slot => <li key={slot.start}>{bookingEnabled ? <button className="button secondary" aria-label={`Book ${label}, ${time.format(new Date(slot.start))} to ${time.format(new Date(slot.end))} in ${zone.replaceAll("_", " ")}`} onClick={() => setSelected(slot)}>{time.format(new Date(slot.start))} – {time.format(new Date(slot.end))}</button> : <><time dateTime={slot.start}>{time.format(new Date(slot.start))}</time> – <time dateTime={slot.end}>{time.format(new Date(slot.end))}</time></>}</li>)}</ul>
    </section>)}</div>
  </div>;
}
