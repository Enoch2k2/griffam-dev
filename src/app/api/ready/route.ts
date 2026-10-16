import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { user } from "@/server/db/schema";

export async function GET() {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  try {
    // Verify both connectivity and the migrated schema, without returning account data.
    await getDatabase()
      .select({ ready: sql`1` })
      .from(user)
      .limit(1);
    return Response.json({ status: "ready" }, { headers });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
