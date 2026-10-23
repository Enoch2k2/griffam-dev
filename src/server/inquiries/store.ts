import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, gte, sql } from "drizzle-orm";
import type { Database } from "@/server/db/connection";
import { emailJob, inquiry } from "@/server/db/schema";
import type { InquiryInput } from "@/features/inquiries/validation";

import { readEmailConfig, type EmailConfig } from "@/server/email/config";
import { inquiryEmails } from "@/server/email/templates";

// Database-backed limits also apply across restarts and multiple app processes.
export async function saveInquiry(db: Database, data: InquiryInput, emailConfig: EmailConfig | null = readEmailConfig()) {
  const requestHash = createHash("sha256")
    .update(JSON.stringify([data.name, data.email, data.service, data.message]))
    .digest("hex");
  return db.transaction(async (tx) => {
    // Serialize this small public inbox's submissions so concurrent requests cannot
    // bypass rate limits or race the idempotency lookup. Released on commit/rollback.
    await tx.execute(sql`select pg_advisory_xact_lock(714103221)`);
    const existing = await tx.query.inquiry.findFirst({ where: eq(inquiry.id, data.id) });
    if (existing) {
      if (existing.requestHash !== requestHash) return "conflict";
      const queued = await tx.query.emailJob.findFirst({ where: eq(emailJob.inquiryId, data.id), columns: { id: true } });
      return queued ? "queued" : "saved";
    }
    const recent = gte(inquiry.createdAt, sql`now() - interval '1 hour'`);
    const [total] = await tx.select({ value: count() }).from(inquiry).where(recent);
    const [sender] = await tx.select({ value: count() }).from(inquiry)
      .where(and(recent, eq(inquiry.email, data.email)));
    if (total.value >= 60 || sender.value >= 3) return "limited";
    await tx.insert(inquiry).values({ ...data, requestHash });
    if (emailConfig) {
      await tx.insert(emailJob).values(inquiryEmails(data, emailConfig).map(job => ({ ...job, inquiryId: data.id })));
    }
    return emailConfig ? "queued" : "saved";
  });
}
