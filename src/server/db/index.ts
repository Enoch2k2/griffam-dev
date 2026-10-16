import "server-only";
import { createDatabase } from "./connection";

let database: ReturnType<typeof createDatabase> | undefined;
export function getDatabase() {
  if (!database) {
    const url = process.env.DATABASE_URL;
    if (!url)
      throw new Error("DATABASE_URL must be configured for database access.");
    database = createDatabase(url);
  }
  return database.db;
}
