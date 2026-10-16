import { defineConfig } from "drizzle-kit";

// Generation does not need credentials; migrations use scripts/migrate.ts.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  strict: true,
});
