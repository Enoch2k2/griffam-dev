import "server-only";
import { getAdminAccess } from "@/server/auth/access";
import { getResume, MAX_RESUME_BYTES, putResume, resumeConfigured } from "./storage";
function reply(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function uploadResume(request: Request) {
  try {
    const access = await getAdminAccess(request.headers);
    if (access.status !== "authorized") return reply("Owner access is required.", access.status === "unavailable" ? 503 : 403);
    const origin = process.env.BETTER_AUTH_URL;
    if (!origin || request.headers.get("origin") !== new URL(origin).origin) return reply("Invalid request origin.", 403);
    if (!resumeConfigured()) return reply("Resume storage is not configured yet.", 503);
    if (request.headers.get("content-type")?.split(";")[0] !== "application/pdf") return reply("Choose a PDF file.", 415);
    const declared = Number(request.headers.get("content-length"));
    if (declared > MAX_RESUME_BYTES) return reply("The PDF must be 5 MB or smaller.", 413);
    const reader = request.body?.getReader();
    if (!reader) return reply("Choose a PDF file.", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_RESUME_BYTES) { await reader.cancel(); return reply("The PDF must be 5 MB or smaller.", 413); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    // Basic format checks, not a malware scan. Owner uploads only; downloads are attachments.
    if (bytes.length < 20 || !bytes.subarray(0, 8).toString("ascii").match(/^%PDF-1\.[0-9]|^%PDF-2\.0/) || !bytes.subarray(-1024).includes(Buffer.from("%%EOF"))) return reply("This file does not look like a complete PDF.", 400);
    await putResume(bytes);
    return reply("Resume published. The public download now uses this PDF.", 200);
  } catch {
    console.error("Resume upload could not be confirmed.");
    return reply("Upload could not be confirmed. Check the current download before retrying.", 503);
  }
}
export async function downloadResume() {
  if (!resumeConfigured()) return reply("A resume is not available yet.", 404);
  try {
    const bytes = await getResume();
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/pdf", "Content-Length": String(bytes.length),
      "Content-Disposition": 'attachment; filename="Enoch-Griffith-Resume.pdf"',
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
    } });
  } catch (error) {
    return (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
      ? reply("A resume is not available yet.", 404) : reply("Resume download is temporarily unavailable.", 503);
  }
}
