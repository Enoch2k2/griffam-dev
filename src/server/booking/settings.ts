import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/server/db/connection";
import { bookingAvailability } from "@/server/db/schema";
import { initialSettings, type Settings } from "@/features/booking/availability";
export async function readSettings(db: Pick<Database, "select">): Promise<Settings> {
  const [row] = await db.select().from(bookingAvailability).where(eq(bookingAvailability.id, "owner"));
  return row ? { ...row.settings, version: row.version } : initialSettings;
}
export async function saveSettings(db: Database, input: Settings) {
  return db.transaction(async tx => {
    // Also serializes the first insert, where no row exists to lock yet.
    await tx.execute(sql`select pg_advisory_xact_lock(714103225)`);
    const current = await readSettings(tx);
    if (current.version !== input.version) return null;
    const { version, ...settings } = input;
    await tx.insert(bookingAvailability).values({ id: "owner", settings, version: version + 1 })
      .onConflictDoUpdate({ target: bookingAvailability.id, set: { settings, version: version + 1, updatedAt: sql`now()` } });
    return { ...settings, version: version + 1 };
  });
}
