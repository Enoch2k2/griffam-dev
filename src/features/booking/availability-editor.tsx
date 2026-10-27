"use client";
import { useState } from "react";
import { candidateSlots, validateSettings, type Settings, type Slot } from "./availability";
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export function AvailabilityEditor({ initial, now }: { initial: Settings; now: string }) {
  const [settings, setSettings] = useState(initial);
  const [dates, setDates] = useState(initial.closedDates.join("\n"));
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  function changed() { setDirty(true); setSlots(null); }
  function input() { return validateSettings({ ...settings, closedDates: dates.split(/[\n,]/).map(s => s.trim()).filter(Boolean) }); }
  function preview() {
    const value = input();
    if (!value) { setError(true); setNotice("Check your time zone, hours and closed dates."); return; }
    setSlots(candidateSlots(value, now, 7, [])); setError(false); setNotice("");
  }
  async function save() {
    const value = input();
    if (!value) { setError(true); setNotice("Check your time zone, hours and closed dates."); return; }
    setPending(true); setNotice("");
    try {
      const response = await fetch("/api/admin/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value), signal: AbortSignal.timeout(20_000) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setSettings(result.settings); setDirty(false); setError(false); setNotice("Availability rules saved. Public booking is still disabled.");
    } catch (error) { setError(true); setNotice(error instanceof Error ? error.message : "Save could not be confirmed."); }
    finally { setPending(false); }
  }
  return <div className="post-editor">
    <p className="body-copy">Free 30-minute calls, at least 24 hours’ notice, and a 30-minute buffer after every call. Calls must finish within your working hours; the buffer may extend afterward.</p>
    <p className="form-help">{settings.version ? "Saved configuration." : "Your confirmed starting hours; save to store them."} {dirty && "Unsaved changes. Save before leaving."}</p>
    <fieldset disabled={pending} className="post-editor-fields">
      <legend className="sr-only">Availability rules</legend>
      <div className="form-field"><label htmlFor="booking-zone">Time zone</label><input id="booking-zone" value={settings.timeZone} onChange={e => { setSettings({ ...settings, timeZone: e.target.value }); changed(); }} /><p className="form-help">Use an IANA zone such as America/Chicago. Daylight saving changes are handled automatically.</p></div>
      {weekdays.map((day, index) => {
        const number = index + 1; const hours = settings.hours.find(row => row.day === number);
        return <fieldset className="availability-day" key={day}><legend>{day}</legend>
          <label><input type="checkbox" checked={Boolean(hours)} onChange={e => { setSettings({ ...settings, hours: e.target.checked ? [...settings.hours, { day: number, start: "09:00", end: "16:00" }] : settings.hours.filter(row => row.day !== number) }); changed(); }} /> Available on {day}</label>
          {hours && <div className="actions">{(["start", "end"] as const).map(field => <label key={field}>{day} {field}<input type="time" aria-label={`${day} ${field}`} value={hours[field]} onChange={e => { setSettings({ ...settings, hours: settings.hours.map(row => row.day === number ? { ...row, [field]: e.target.value } : row) }); changed(); }} /></label>)}</div>}
        </fieldset>;
      })}
      <div className="form-field"><label htmlFor="closed-dates">Days off</label><p className="form-help">One date per line, YYYY-MM-DD, in your time zone. Leave empty if none.</p><textarea id="closed-dates" rows={4} value={dates} onChange={e => { setDates(e.target.value); changed(); }} /></div>
      <div className="actions"><button type="button" className="button" onClick={save}>{pending ? "Saving…" : "Save availability"}</button><button type="button" className="button secondary" onClick={preview}>Preview next 7 days</button></div>
    </fieldset>
    {notice && <p className="inquiry-feedback" role={error ? "alert" : "status"}>{notice}</p>}
    {slots && <section aria-label="Availability preview" className="post-preview"><h2>Schedule preview</h2><p className="body-copy">Candidate times in {settings.timeZone}. This preview uses your current form values, does not check Google Calendar or reserve a slot, and does not enable public booking.</p>
      {!slots.length && <p>No candidate slots in the next 7 days.</p>}
      {[...new Set(slots.map(s => s.date))].map(date => <details key={date}><summary>{date} · {slots.filter(s => s.date === date).length} candidate times</summary><ul>{slots.filter(s => s.date === date).map(slot => <li key={slot.start}>{new Intl.DateTimeFormat("en-US", { timeZone: settings.timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(slot.start))} – {new Intl.DateTimeFormat("en-US", { timeZone: settings.timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(slot.end))}</li>)}</ul></details>)}
    </section>}
  </div>;
}
