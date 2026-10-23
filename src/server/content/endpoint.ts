import "server-only";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { validatePost } from "@/features/content/validation";
import { writePost } from "./store";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export async function savePostRequest(request: Request) {
  try {
    const access = await getAdminAccess(request.headers);
    if (access.status !== "authorized") return reply({ error: "Owner access is required." }, access.status === "unavailable" ? 503 : 403);
    if (!process.env.BETTER_AUTH_URL || request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL).origin) return reply({ error: "Invalid request origin." }, 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply({ error: "Expected JSON." }, 415);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Empty request." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 200_000) { await reader.cancel(); return reply({ error: "Article is too large." }, 413); }
      chunks.push(value);
    }
    let value: unknown;
    try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return reply({ error: "Invalid JSON." }, 400); }
    const input = validatePost(value);
    if (!input) return reply({ error: "Check title (3–160), slug (3–100 lowercase letters/numbers/hyphens), summary (up to 300) and body (up to 40,000). Publishing also needs a summary of at least 10 characters and a body of at least 20." }, 400);
    const result = await writePost(getDatabase(), input);
    if (result.status === "conflict") return reply({ error: "This article changed in another tab, or a previous save completed. Your text is still here. Copy it before reloading the article from the list." }, 409);
    if (result.status === "slug_locked") return reply({ error: "Unpublish before changing a live article URL." }, 409);
    return reply(result);
  } catch (error) {
    const code = (error as { cause?: { code?: string }; code?: string })?.cause?.code ?? (error as { code?: string })?.code;
    if (code === "23505") return reply({ error: "That URL or article ID is already in use. Your text has been kept; open the saved article from the list before retrying." }, 409);
    console.error("Article persistence failed.");
    return reply({ error: "Unable to confirm the save. Your text has been kept; try again or check the article list." }, 503);
  }
}
