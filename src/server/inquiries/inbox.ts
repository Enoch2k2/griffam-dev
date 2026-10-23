import "server-only";
import { desc, inArray } from "drizzle-orm";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { emailJob, inquiry } from "@/server/db/schema";

export async function readInbox(headers: Headers, page: number) {
  const access = await getAdminAccess(headers);
  if (access.status !== "authorized") return { status: "denied" } as const;
  try {
    const rows = await getDatabase().select({
      id: inquiry.id, name: inquiry.name, email: inquiry.email,
      service: inquiry.service, message: inquiry.message, createdAt: inquiry.createdAt,
    }).from(inquiry).orderBy(desc(inquiry.createdAt), desc(inquiry.id)).limit(21).offset((page - 1) * 20);
    const pageRows = rows.slice(0, 20);
    const jobs = pageRows.length ? await getDatabase().select({
      inquiryId: emailJob.inquiryId, kind: emailJob.kind, status: emailJob.status,
      attempts: emailJob.attempts, lastError: emailJob.lastError,
    }).from(emailJob).where(inArray(emailJob.inquiryId, pageRows.map(row => row.id))) : [];
    return { status: "ready", rows: pageRows.map(row => ({
      ...row, emails: jobs.filter(job => job.inquiryId === row.id),
    })), hasMore: rows.length > 20 } as const;
  } catch {
    return { status: "unavailable" } as const;
  }
}
