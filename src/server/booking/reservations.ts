import "server-only";
import { createHash } from "node:crypto";
import { and, count, eq, gte, lt, ne, or, sql } from "drizzle-orm";
import { candidateSlots, type Busy } from "@/features/booking/availability";
import { validateReservation } from "@/features/booking/reservation";
import type { Database } from "@/server/db/connection";
import { bookingReservation as table } from "@/server/db/schema";
import { readSettings } from "./settings";

export const HOLD_MINUTES = 10;
// Required dependency: the caller must supply a fresh Google free/busy read.
// This internal service has no public route until provider provisioning is ready.
export async function holdReservation(db: Database, value: unknown, fetchBusy: (start: string, end: string) => Promise<Busy[]>) {
  const data = validateReservation(value);
  if (!data) return { status: "invalid" } as const;
  const requestHash = createHash("sha256").update(JSON.stringify([data.start, data.name, data.email, data.timeZone, data.notes])).digest("hex");
  return db.transaction(async tx => {
    await tx.execute(sql`set local lock_timeout = '3s'`);
    // Same lock as owner schedule saves: no stale settings accepted during a save.
    await tx.execute(sql`select pg_advisory_xact_lock(714103225)`);
    await tx.update(table).set({ status: "cancelled" }).where(and(eq(table.status, "held"), lt(table.expiresAt, sql`clock_timestamp()`)));
    const [existing] = await tx.select().from(table).where(eq(table.id, data.id));
    if (existing) {
      if (existing.requestHash !== requestHash) return { status: "id_conflict" } as const;
      if (existing.status === "cancelled") return { status: "expired" } as const;
      return { status: "existing", id: existing.id, state: existing.status, expiresAt: existing.expiresAt.toISOString() } as const;
    }
    const recent = gte(table.createdAt, sql`clock_timestamp() - interval '1 hour'`);
    const [total] = await tx.select({ value: count() }).from(table).where(recent);
    const [sender] = await tx.select({ value: count() }).from(table).where(and(recent, eq(table.email, data.email)));
    if (total.value >= 60 || sender.value >= 3) return { status: "limited" } as const;
    const settings = await readSettings(tx);
    const [{ now: before }] = await tx.select({ now: sql<string>`clock_timestamp()::text` }).from(sql`(select 1) as clock`);
    if (!settings.version || !candidateSlots(settings, new Date(before).toISOString(), 30, []).some(slot => slot.start === data.start)) return { status: "unavailable" } as const;
    const start = new Date(data.start);
    const end = new Date(start.getTime() + 30 * 60_000);
    // Include external event buffers both before and after this candidate.
    const busy = await fetchBusy(new Date(start.getTime() - 30 * 60_000).toISOString(), new Date(end.getTime() + 30 * 60_000).toISOString());
    const local = await tx.select({ start: table.startsAt, end: table.endsAt }).from(table)
      .where(and(ne(table.status, "cancelled"), lt(table.startsAt, new Date(end.getTime() + 30 * 60_000)), gte(table.occupiedUntil, start)));
    // Recheck elapsed notice after the network request, using the database clock.
    const [{ now }] = await tx.select({ now: sql<string>`clock_timestamp()::text` }).from(sql`(select 1) as clock`);
    const checkedAt = new Date(now);
    if (!candidateSlots(settings, checkedAt.toISOString(), 30, [...busy, ...local.map(row => ({ start: row.start.toISOString(), end: row.end.toISOString() }))]).some(slot => slot.start === data.start)) return { status: "unavailable" } as const;
    const expiresAt = new Date(checkedAt.getTime() + HOLD_MINUTES * 60_000);
    await tx.insert(table).values({ id: data.id, requestHash, name: data.name, email: data.email, timeZone: data.timeZone, notes: data.notes, startsAt: start, endsAt: end, occupiedUntil: new Date(end.getTime() + 30 * 60_000), expiresAt });
    return { status: "held", id: data.id, expiresAt: expiresAt.toISOString() } as const;
  });
}

// Held slots expire; provisioning/ambiguous outcomes must keep blocking until reconciled.
export async function reservationBusy(db: Database, start: Date, end: Date): Promise<Busy[]> {
  const rows = await db.select({ start: table.startsAt, end: table.endsAt }).from(table).where(and(
    ne(table.status, "cancelled"), or(ne(table.status, "held"), gte(table.expiresAt, sql`clock_timestamp()`)),
    lt(table.startsAt, end), gte(table.occupiedUntil, start),
  ));
  return rows.map(row => ({ start: row.start.toISOString(), end: row.end.toISOString() }));
}
