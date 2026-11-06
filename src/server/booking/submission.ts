import "server-only";
import { getAdminAccess } from "@/server/auth/access";
import { validateReservation } from "@/features/booking/reservation";
import { getDatabase } from "@/server/db";
import { confirmReservation, recoverReservation } from "./confirmation";
import { readBookingRuntime } from "./readiness";
import { takeBookingRequest } from "./request-budget";

const headers = { "Cache-Control": "no-store" };
function reply(body: object, status = 200, extra: HeadersInit = {}) {
  return Response.json(body, { status, headers: { ...headers, ...extra } });
}
function exactOrigin(request: Request) {
  try { return !!process.env.BETTER_AUTH_URL && request.headers.get("origin") === new URL(process.env.BETTER_AUTH_URL).origin; }
  catch { return false; }
}
async function json(request: Request, maxBytes: number) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return { error: "Expected a JSON request.", status: 415 } as const;
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { error: "The request is too large.", status: 413 } as const;
  const reader = request.body?.getReader();
  if (!reader) return { error: "The request is empty.", status: 400 } as const;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return { error: "The request is too large.", status: 413 } as const; }
      chunks.push(part.value);
    }
    return { value: JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown } as const;
  } catch { return { error: "The request could not be read.", status: 400 } as const; }
}

export async function submitBooking(request: Request) {
  if (!exactOrigin(request)) return reply({ error: "Please submit this form from the GriffamDev website." }, 403);
  const parsed = await json(request, 16_000);
  if ("error" in parsed) return reply({ error: parsed.error }, parsed.status);
  const raw = parsed.value as Record<string, unknown> | null;
  if (raw && typeof raw === "object" && raw.website) return reply({ error: "The booking could not be accepted." }, 400);
  const input = validateReservation(raw);
  if (!input) return reply({ error: "Check the selected time, name, email address, time zone, and notes." }, 400);
  try {
    const db = getDatabase();
    const runtime = await readBookingRuntime(db);
    if (!runtime) return reply({ error: "Online booking is temporarily unavailable. You can still view call times." }, 503);
    if (!await takeBookingRequest(db)) return reply({ error: "Too many booking attempts are in progress. Please retry this same booking in a minute." }, 429, { "Retry-After": "60" });
    const result = await confirmReservation(db, input, runtime);
    if (result.status === "confirmed") return reply(result);
    if (result.status === "pending") return reply(result, 202);
    if (result.status === "limited") return reply({ error: "Too many bookings were requested. Please try again later." }, 429, { "Retry-After": "3600" });
    if (result.status === "conflict") return reply({ error: "This booking reference belongs to different details. Refresh before starting a new booking." }, 409);
    if (result.status === "unavailable") return reply({ error: "That time is no longer available. Refresh and choose another time." }, 409);
    return reply({ error: "Check your booking details." }, 400);
  } catch {
    console.error("Booking confirmation failed.");
    return reply({ error: "We could not verify whether this booking completed. Retry the same booking reference." }, 503);
  }
}

function recoveryInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return null;
  if (body.action !== "resume" && body.action !== "adopt" && body.action !== "release") return null;
  if (body.meetingId !== undefined && (typeof body.meetingId !== "string" || !/^\d{9,15}$/.test(body.meetingId))) return null;
  if (body.acknowledged !== undefined && typeof body.acknowledged !== "boolean") return null;
  return { id: body.id, action: body.action as "resume" | "adopt" | "release", meetingId: body.meetingId as string | undefined, acknowledged: body.acknowledged as boolean | undefined };
}

export async function recoverBooking(request: Request) {
  const access = await getAdminAccess(request.headers);
  if (access.status !== "authorized") return reply({ error: "Owner access is required." }, access.status === "unavailable" ? 503 : 403);
  if (!exactOrigin(request)) return reply({ error: "Invalid request origin." }, 403);
  const parsed = await json(request, 4_000);
  if ("error" in parsed) return reply({ error: parsed.error }, parsed.status);
  const input = recoveryInput(parsed.value);
  if (!input) return reply({ error: "Check the booking reference and recovery action." }, 400);
  try {
    const db = getDatabase();
    const runtime = await readBookingRuntime(db);
    if (!runtime) return reply({ error: "Booking provider setup is incomplete." }, 503);
    const result = await recoverReservation(db, input, runtime);
    if (result.status === "confirmed" || result.status === "cancelled") return reply(result);
    if (result.status === "pending") return reply(result, 202);
    if (result.status === "invalid") return reply({ error: "This recovery action does not match the saved booking. Reload before trying again." }, 400);
    return reply({ error: "The booking changed or is being processed. Reload before taking another action." }, 409);
  } catch {
    console.error("Booking recovery failed.");
    return reply({ error: "Recovery could not be verified. Reload before taking another action." }, 503);
  }
}
