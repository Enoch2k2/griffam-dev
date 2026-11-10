import "server-only";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { scheduleBookingEmails } from "@/server/email/immediate";
import { readBookingRuntime } from "./readiness";
import { cancelOwnerBooking } from "./management";

const headers = { "Cache-Control": "no-store" };
function reply(body: object, status = 200) { return Response.json(body, { status, headers }); }
function exactOrigin(request: Request) {
  try { return !!process.env.BETTER_AUTH_URL && request.headers.get("origin") === new URL(process.env.BETTER_AUTH_URL).origin; }
  catch { return false; }
}

export async function cancelAdminBooking(request: Request) {
  try {
    const access = await getAdminAccess(request.headers);
    if (access.status !== "authorized") return reply({ error: "Owner access is required." }, access.status === "unavailable" ? 503 : 403);
    if (!exactOrigin(request)) return reply({ error: "Invalid request origin." }, 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Expected a JSON request." }, 415);
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > 1024) return reply({ error: "The request is too large." }, 413);
    let value: unknown;
    try { value = await request.json(); } catch { return reply({ error: "Invalid JSON." }, 400); }
    const id = value && typeof value === "object" ? (value as Record<string, unknown>).id : null;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return reply({ error: "Check the booking reference." }, 400);

    const db = getDatabase();
    const runtime = await readBookingRuntime(db);
    if (!runtime) return reply({ error: "Booking provider setup is incomplete." }, 503);
    const result = await cancelOwnerBooking(db, id, runtime);
    if (result.status === "cancelled") {
      scheduleBookingEmails(result.id);
      return reply({ status: "cancelled", id: result.id });
    }
    if (result.status === "pending") return reply({ status: "pending", id }, 202);
    if (result.status === "conflict") return reply({ error: "The booking changed or is already being processed. Refresh the list and try again." }, 409);
    return reply({ error: "This booking cannot be cancelled from the owner list. Refresh the page to check its status." }, 409);
  } catch {
    console.error("Owner booking cancellation could not be verified.");
    return reply({ error: "Cancellation could not be verified. Refresh the booking list before trying again." }, 503);
  }
}
