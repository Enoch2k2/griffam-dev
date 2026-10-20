import "server-only";
import { validateInquiry } from "@/features/inquiries/validation";
import { getDatabase } from "@/server/db";
import { saveInquiry } from "./store";

const maxBytes = 24_000;
const headers = { "Cache-Control": "no-store" };
function reply(error: string, status: number) {
  return Response.json({ error }, { status, headers });
}
export async function submitInquiry(request: Request) {
  const configuredOrigin = process.env.BETTER_AUTH_URL;
  if (!configuredOrigin || !process.env.DATABASE_URL) return reply("The inquiry form is temporarily unavailable. Please use LinkedIn below.", 503);
  let origin: string;
  try { origin = new URL(configuredOrigin).origin; } catch { return reply("The inquiry form is temporarily unavailable.", 503); }
  if (request.headers.get("origin") !== origin) return reply("Please submit this form from the GriffamDev website.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply("Expected a JSON request.", 415);
  if (Number(request.headers.get("content-length")) > maxBytes) return reply("Your message is too large.", 413);
  let value: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply("Your request is empty.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > maxBytes) { await reader.cancel(); return reply("Your message is too large.", 413); }
      chunks.push(chunk);
    }
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return reply("Your request could not be read.", 400); }
  if (value && typeof value === "object" && "website" in value && value.website) {
    return reply("Your request could not be accepted. Please use LinkedIn below.", 400);
  }
  const validated = validateInquiry(value);
  if (!validated.ok) return Response.json({ error: "Please check the highlighted fields.", errors: validated.errors }, { status: 400, headers });
  try {
    const result = await saveInquiry(getDatabase(), validated.data);
    if (result === "limited") return Response.json({ error: "Too many inquiries have been submitted. Please try again in an hour or use LinkedIn below." }, { status: 429, headers: { ...headers, "Retry-After": "3600" } });
    if (result === "conflict") return reply("This submission reference was already used for a different message. Refresh before sending a new inquiry.", 409);
    return Response.json({ status: "saved" }, { headers });
  } catch {
    // Never log inquiry contents, email addresses, credentials, or raw DB errors.
    console.error("Inquiry persistence failed.");
    return reply("We couldn't confirm your inquiry was saved. Your message is still here; please try again.", 503);
  }
}
