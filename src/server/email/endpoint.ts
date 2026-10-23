import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getDatabase } from "@/server/db";
import { readEmailConfig } from "./config";
import { drainEmail } from "./worker";

export async function runEmailWorker(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const secret = process.env.EMAIL_WORKER_SECRET;
  const token = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || secret.length < 32 || Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  const config = readEmailConfig();
  if (!config) return Response.json({ error: "Email delivery is disabled or unconfigured." }, { status: 503, headers });
  try {
    return Response.json(await drainEmail(getDatabase(), config.apiKey), { headers });
  } catch {
    console.error("Email worker failed; pending jobs remain recoverable.");
    return Response.json({ error: "Email worker unavailable." }, { status: 503, headers });
  }
}
