import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { eq } from "drizzle-orm";
import { createDatabase } from "../src/server/db/connection";
import { verification } from "../src/server/db/schema";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const { db, pool } = createDatabase(process.env.DATABASE_URL);
const id = `connection-check-${randomUUID()}`;
const rollback = new Error("Intentional verification rollback");
try {
  try {
    await db.transaction(async (transaction) => {
      await transaction.insert(verification).values({
        id,
        identifier: id,
        value: "connection-check",
        expiresAt: new Date(),
      });
      const rows = await transaction
        .select({ id: verification.id })
        .from(verification)
        .where(eq(verification.id, id));
      if (rows.length !== 1) throw new Error("Read-after-write check failed");
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  const rows = await db
    .select({ id: verification.id })
    .from(verification)
    .where(eq(verification.id, id));
  if (rows.length) throw new Error("Rollback check failed");
  console.log(
    "PostgreSQL read/write/rollback check passed. No verification data retained.",
  );
} catch {
  console.error(
    "Database verification failed. Check connection and migrations; credentials are not logged.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
