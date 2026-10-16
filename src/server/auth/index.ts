import "server-only";
import { getDatabase } from "../db";
import { createAuth } from "./create-auth";
import { readAuthConfig } from "./config";

let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  const config = readAuthConfig();
  if (!config) return null;
  auth ??= createAuth(getDatabase(), config);
  return auth;
}
