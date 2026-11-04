"use client";
import { useState } from "react";
type Slot = { start: string; end: string };
export function CallTimes({ timeZones }: { timeZones: string[] }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [zone, setZone] = useState("America/Chicago");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const zones = Array.from(new Set([zone, "America/Chicago", ...timeZones]));
  async function load() {
    setPending(true); setSlots(null); setMessage("");
    try {
      const response = await fetch("/api/booking/availability", { cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json();
      setSlots(data.slots);
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
  return <div className="call-times">
    <div className="form-field"><label htmlFor="booking-zone">Display time zone</label>
      <select id="booking-zone" value={zone} onChange={event => setZone(event.target.value)}>{zones.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
    </div>
    <div className="actions">
      <button className="button secondary" onClick={() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use my time zone</button>
      <button className="button" disabled={pending} onClick={load}>{pending ? "Checking calendar…" : slots ? "Refresh times" : "View available times"}</button>
    </div>
    <p role="status" aria-live="polite">{message}</p>
    <div className="call-days" aria-busy={pending}>{Array.from(grouped, ([label, values]) => <section className="call-day" key={label}>
      <h2>{label}</h2><ul>{values.map(slot => <li key={slot.start}><time dateTime={slot.start}>{time.format(new Date(slot.start))}</time> – <time dateTime={slot.end}>{time.format(new Date(slot.end))}</time></li>)}</ul>
    </section>)}</div>
  </div>;
}
