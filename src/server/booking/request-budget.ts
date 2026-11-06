import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/server/db/connection";
import { bookingRequestLimit } from "@/server/db/schema";

export const BOOKING_REQUESTS_PER_MINUTE = 20;

export async function takeBookingRequest(db: Database) {
  return db.transaction(async tx => {
    await tx.delete(bookingRequestLimit).where(sql`${bookingRequestLimit.createdAt} < now() - interval '2 hours'`);
    const result = await tx.execute<{ attempts: number }>(sql`
      insert into booking_request_limit (bucket, attempts)
      values ('global:' || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDDHH24MI'), 1)
      on conflict (bucket) do update set attempts = booking_request_limit.attempts + 1
      returning attempts
    `);
    return Number(result.rows[0]?.attempts ?? BOOKING_REQUESTS_PER_MINUTE + 1) <= BOOKING_REQUESTS_PER_MINUTE;
  });
}
