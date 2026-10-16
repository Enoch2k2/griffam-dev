import nextEnv from "@next/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "Set DATABASE_URL_UNPOOLED or DATABASE_URL before migrating.",
  );
const pool = new Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 10_000,
});
try {
  const client = await pool.connect();
  try {
    // A direct PostgreSQL connection keeps this session lock across migration transactions.
    await client.query("SET lock_timeout = '30s'");
    await client.query("SELECT pg_advisory_lock(714103220)");
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("Database migrations applied.");
  } finally {
    // Closing the connection also releases the lock after failed migrations.
    client.release(true);
  }
} catch {
  console.error(
    "Migration failed. Inspect database access and migration history; credentials are not logged.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
