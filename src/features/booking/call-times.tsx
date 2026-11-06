"use client";
import { useEffect, useMemo, useState } from "react";
import { validateReservation } from "./reservation";
import { BookingForm } from "./booking-form";
import { BookingCalendar } from "./booking-calendar";
import { dateKeyForInstant, groupSlotsByDate, monthKey, type BookingSlot } from "./calendar-view";

export function CallTimes({ timeZones }: { timeZones: string[] }) {
  const [selected, setSelected] = useState<BookingSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<string | null>(null);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [slots, setSlots] = useState<BookingSlot[] | null>(null);
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

  const grouped = useMemo(() => groupSlotsByDate(slots ?? [], zone), [slots, zone]);

  function updateCalendar(nextSlots: BookingSlot[], nextZone: string, preferredDate: string | null) {
    const nextGrouped = groupSlotsByDate(nextSlots, nextZone);
    const nextDate = preferredDate && nextGrouped[preferredDate] ? preferredDate : Object.keys(nextGrouped).sort()[0] ?? null;
    setSelectedDate(nextDate);
    setVisibleMonth(nextDate ? monthKey(nextDate) : null);
  }

  function changeZone(nextZone: string) {
    setZone(nextZone);
    if (slots) updateCalendar(slots, nextZone, selectedDate);
  }

  async function load(preferredDate: string | null = selectedDate) {
    setPending(true); setSlots(null); setBookingEnabled(false); setMessage("");
    try {
      const response = await fetch("/api/booking/availability", { cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json();
      if (!Array.isArray(data.slots) || data.slots.length > 500 || !Number.isInteger(data.days) || data.days < 1 || data.days > 31 || data.slots.some((value: unknown) => {
        const slot = value as Partial<BookingSlot>;
        return typeof slot?.start !== "string" || typeof slot.end !== "string" || !Number.isFinite(Date.parse(slot.start)) || Date.parse(slot.end) - Date.parse(slot.start) !== 30 * 60_000;
      })) throw new Error("Invalid availability");
      const nextSlots = data.slots as BookingSlot[];
      setSlots(nextSlots);
      setBookingEnabled(data.bookingEnabled === true);
      updateCalendar(nextSlots, zone, preferredDate);
      setMessage(nextSlots.length ? `Showing available times over the next ${data.days} days.` : "No call times are available in this window. Please contact me to find a time.");
    } catch {
      setSelectedDate(null); setVisibleMonth(null);
      setMessage("Call times are temporarily unavailable. Please try again or contact me.");
    } finally { setPending(false); }
  }

  if (selected) return <BookingForm slot={selected} timeZone={zone} onChangeTime={() => {
    const preferredDate = dateKeyForInstant(selected.start, zone);
    setSelected(null);
    void load(preferredDate);
  }} />;

  return <div className="call-times">
    <div className="form-field"><label htmlFor="booking-zone">Display time zone</label>
      <select id="booking-zone" value={zone} onChange={event => changeZone(event.target.value)}>{zones.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
    </div>
    <div className="actions">
      <button className="button secondary" onClick={() => changeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use my time zone</button>
      <button className="button" disabled={pending} onClick={() => void load()}>{pending ? "Checking calendar…" : slots ? "Refresh times" : "View available times"}</button>
    </div>
    <p role="status" aria-live="polite">{message}</p>
    {slots && <p>{bookingEnabled ? "Choose a day and time to review and book your free Zoom call." : "Online reservations are not available yet. Viewing a time does not reserve it."}</p>}
    <div aria-busy={pending}>{slots && slots.length > 0 && visibleMonth && <BookingCalendar
      slotsByDate={grouped}
      selectedDate={selectedDate}
      visibleMonth={visibleMonth}
      timeZone={zone}
      bookingEnabled={bookingEnabled}
      today={dateKeyForInstant(new Date().toISOString(), zone)}
      onSelectDate={setSelectedDate}
      onSelectSlot={setSelected}
      onMonthChange={setVisibleMonth}
    />}</div>
  </div>;
}
