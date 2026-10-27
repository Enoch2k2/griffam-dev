import "server-only";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { validateSettings } from "@/features/booking/availability";
import { saveSettings } from "./settings";
function reply(body: object, status: number) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
export async function updateAvailability(request: Request) {
  try {
    if ((await getAdminAccess(request.headers)).status !== "authorized") return reply({ error: "Owner access is required." }, 403);
    if (!process.env.BETTER_AUTH_URL || request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL).origin) return reply({ error: "Invalid request origin." }, 403);
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return reply({ error: "Expected JSON." }, 415);
    const reader = request.body?.getReader(); if (!reader) return reply({ error: "Missing settings." }, 400);
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.length;
      if (bytes > 16000) { await reader.cancel(); return reply({ error: "Settings are too large." }, 413); } chunks.push(part.value); }
    let value: unknown;
    try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return reply({ error: "Invalid JSON." }, 400); }
    const settings = validateSettings(value);
    if (!settings) return reply({ error: "Check the time zone, same-day hours and closed dates (YYYY-MM-DD)." }, 400);
    const saved = await saveSettings(getDatabase(), settings);
    return saved ? reply({ settings: saved }, 200) : reply({ error: "Settings changed in another tab. Copy your changes before reloading." }, 409);
  } catch { return reply({ error: "Save could not be confirmed. Your changes are still here." }, 503); }
}
