import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Shared by server-only runtime code and trusted CLI/test entrypoints.
export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 10_000,
  });
  pool.on("error", () => {
    console.error(
      "An idle database connection failed; the pool will replace it.",
    );
  });
  return { pool, db: drizzle(pool, { schema }) };
}
export type Database = ReturnType<typeof createDatabase>["db"];
