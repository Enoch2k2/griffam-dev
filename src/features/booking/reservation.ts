export type ReservationInput = { id: string; start: string; name: string; email: string; timeZone: string; notes: string };
export function validateReservation(value: unknown): ReservationInput | null {
  if (!value || typeof value !== "object") return null;
  const fields = value as Record<string, unknown>;
  const text = (key: string) => typeof fields[key] === "string" ? fields[key].trim() : "";
  const data = { id: text("id"), start: text("start"), name: text("name"), email: text("email").toLowerCase(), timeZone: text("timeZone"), notes: text("notes") };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/.test(data.start) || !Number.isFinite(Date.parse(data.start))) return null;
  if (new Date(data.start).toISOString() !== data.start.replace("Z", ".000Z")) return null;
  if (data.name.length < 2 || data.name.length > 100 || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.notes.length > 2000) return null;
  if (!data.timeZone || data.timeZone.length > 100 || /^[+-]/.test(data.timeZone)) return null;
  try { new Intl.DateTimeFormat("en", { timeZone: data.timeZone }); } catch { return null; }
  return data;
}
