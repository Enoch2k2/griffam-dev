import "server-only";
import { getDatabase } from "@/server/db";
import { readBookingRuntime } from "./readiness";
import { cancelManagedBooking, readManagedBooking } from "./management";
import { scheduleBookingEmails } from "@/server/email/immediate";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
function reply(body: object, status = 200) { return Response.json(body, { status, headers }); }
function exactOrigin(request: Request) {
  try { return !!process.env.BETTER_AUTH_URL && request.headers.get("origin") === new URL(process.env.BETTER_AUTH_URL).origin; }
  catch { return false; }
}
async function body(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return null;
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > 1024) return null;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object") return null;
    const input = value as Record<string, unknown>;
    if (typeof input.token !== "string" || input.token.length > 64 || (input.action !== "read" && input.action !== "cancel")) return null;
    return { token: input.token, action: input.action };
  } catch { return null; }
}

export async function manageBooking(request: Request) {
  if (!exactOrigin(request)) return reply({ error: "Please manage this booking from the GriffamDev website." }, 403);
  const input = await body(request);
  if (!input) return reply({ error: "This booking request is invalid." }, 400);
  try {
    const db = getDatabase();
    if (input.action === "read") {
      const booking = await readManagedBooking(db, input.token);
      return booking ? reply({ booking }) : reply({ error: "This booking link is invalid or has expired." }, 404);
    }
    const runtime = await readBookingRuntime(db);
    if (!runtime) return reply({ error: "Booking management is temporarily unavailable. Please contact GriffamDev." }, 503);
    const result = await cancelManagedBooking(db, input.token, runtime);
    if (result.status === "cancelled") { scheduleBookingEmails(result.id); return reply({ status: "cancelled" }); }
    if (result.status === "pending") return reply({ error: "Cancellation is being finalized. Refresh this page shortly to check its status." }, 202);
    if (result.status === "cutoff") return reply({ error: "Online cancellation is available until 24 hours before the call. Please contact GriffamDev for help." }, 409);
    return reply({ error: "This booking link is invalid or has expired." }, 404);
  } catch {
    console.error(input.action === "read" ? "Booking management lookup failed." : "Booking cancellation could not be verified.");
    return reply({ error: input.action === "read" ? "Booking details are temporarily unavailable. Please try again." : "Cancellation could not be verified. Please refresh before trying again." }, 503);
  }
}
