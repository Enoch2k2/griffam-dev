import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Database } from "@/server/db/connection";
import { calendarConnection as table } from "@/server/db/schema";
export async function readConnection(db: Database): Promise<typeof table.$inferSelect | null> {
  const [row] = await db.select().from(table).where(eq(table.id, "owner"));
  return row ?? null;
}
export async function beginConsent(db: Database, ownerId: string, stateHash: string, encryptedVerifier: string) {
  const values = { ownerId, stateHash, encryptedVerifier, stateExpiresAt: new Date(Date.now() + 600_000) };
  await db.insert(table).values({ id: "owner", ...values }).onConflictDoUpdate({ target: table.id, set: { ...values, revision: sql`${table.revision} + 1` } });
}
// A single-use claim. Keeping the revision allows disconnect/new consent to invalidate
// an in-flight Google exchange before it can write a credential back.
export async function claimConsent(db: Database, ownerId: string, stateHash: string): Promise<typeof table.$inferSelect | null> {
  const [row] = await db.update(table).set({ stateExpiresAt: null })
    .where(and(eq(table.id, "owner"), eq(table.ownerId, ownerId), eq(table.stateHash, stateHash), gt(table.stateExpiresAt, new Date())))
    .returning();
  return row ?? null;
}
export async function finishConsent(db: Database, revision: number, stateHash: string, encryptedRefreshToken: string, accountEmail: string, eventWriteGranted = false) {
  const rows = await db.update(table).set({ encryptedRefreshToken, accountEmail, eventWriteGranted, connectedAt: new Date(), stateHash: null, encryptedVerifier: null })
    .where(and(eq(table.id, "owner"), eq(table.revision, revision), eq(table.stateHash, stateHash))).returning({ id: table.id });
  return rows.length === 1;
}
export async function disconnectCalendar(db: Database) {
  await db.delete(table).where(eq(table.id, "owner"));
}
