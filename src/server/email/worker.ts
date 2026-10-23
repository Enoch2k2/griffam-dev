import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, lte, or, sql } from "drizzle-orm";
import type { Database } from "@/server/db/connection";
import { emailJob } from "@/server/db/schema";
import { sendEmail } from "./provider";

// Resend keeps idempotency keys for 24h. Stop automatic retries after 23h,
// including abandoned leases, rather than risk a second email after expiry.
export async function claimEmail(db: Database) {
  return db.transaction(async tx => {
    const [job] = await tx.select().from(emailJob).where(or(
      and(eq(emailJob.status, "pending"), lte(emailJob.availableAt, sql`now()`)),
      and(eq(emailJob.status, "processing"), lte(emailJob.leaseUntil, sql`now()`)),
    )).orderBy(asc(emailJob.availableAt)).limit(1).for("update", { skipLocked: true });
    if (!job) return null;
    const [clock] = await tx.select({ expired: sql<boolean>`${emailJob.firstAttemptAt} < now() - interval '23 hours'` })
      .from(emailJob).where(eq(emailJob.id, job.id));
    if (clock.expired || job.attempts >= 8) {
      await tx.update(emailJob).set({ status: "review", lastError: "retry_window_exhausted", leaseToken: null, leaseUntil: null }).where(eq(emailJob.id, job.id));
      return { review: true } as const;
    }
    const [claimed] = await tx.update(emailJob).set({
      status: "processing", attempts: job.attempts + 1, leaseToken: randomUUID(),
      firstAttemptAt: sql`coalesce(${emailJob.firstAttemptAt}, now())`,
      leaseUntil: sql`now() + interval '2 minutes'`,
    }).where(eq(emailJob.id, job.id)).returning();
    return { review: false, job: claimed } as const;
  });
}

export async function drainEmail(db: Database, apiKey: string, send = sendEmail) {
  const counts = { accepted: 0, pending: 0, failed: 0, review: 0 };
  // Small bounded batches let a scheduler wake a sleeping Render service.
  for (let index = 0; index < 5; index++) {
    const claim = await claimEmail(db);
    if (!claim) break;
    if (claim.review) { counts.review++; continue; }
    const { job } = claim;
    const result = await send(job.payload, job.id, apiKey);
    const status = result.status === "retry" ? (job.attempts >= 8 ? "review" : "pending") : result.status;
    const delaySeconds = Math.min(3600, 60 * 2 ** job.attempts);
    // Fencing token prevents a late worker from overwriting a recovered lease.
    const updated = await db.update(emailJob).set({
      status, leaseUntil: null, leaseToken: null,
      providerId: result.status === "accepted" ? result.id : null,
      lastError: result.status === "accepted" ? null : result.error,
      availableAt: sql`now() + ${delaySeconds} * interval '1 second'`,
    }).where(and(eq(emailJob.id, job.id), eq(emailJob.leaseToken, job.leaseToken!))).returning({ id: emailJob.id });
    if (updated.length) counts[status]++;
  }
  return counts;
}
