import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, gte, sql } from "drizzle-orm";
import type { Database } from "@/server/db/connection";
import { inquiry } from "@/server/db/schema";
import type { InquiryInput } from "@/features/inquiries/validation";

// Database-backed limits also apply across restarts and multiple app processes.
export async function saveInquiry(db: Database, data: InquiryInput) {
  const requestHash = createHash("sha256")
    .update(JSON.stringify([data.name, data.email, data.service, data.message]))
    .digest("hex");
  return db.transaction(async (tx) => {
    // Serialize this small public inbox's submissions so concurrent requests cannot
    // bypass rate limits or race the idempotency lookup. Released on commit/rollback.
    await tx.execute(sql`select pg_advisory_xact_lock(714103221)`);
    const existing = await tx.query.inquiry.findFirst({ where: eq(inquiry.id, data.id) });
    if (existing) return existing.requestHash === requestHash ? "saved" : "conflict";
    const recent = gte(inquiry.createdAt, sql`now() - interval '1 hour'`);
    const [total] = await tx.select({ value: count() }).from(inquiry).where(recent);
    const [sender] = await tx.select({ value: count() }).from(inquiry)
      .where(and(recent, eq(inquiry.email, data.email)));
    if (total.value >= 60 || sender.value >= 3) return "limited";
    await tx.insert(inquiry).values({ ...data, requestHash });
    return "saved";
  });
}
