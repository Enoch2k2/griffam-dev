import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { Database } from "../db/connection";
import * as schema from "../db/schema";
import { isOwner, type AuthConfig } from "./config";

// Only imported by server-only runtime code and trusted integration tests.
export function createAuth(db: Database, config: AuthConfig) {
  return betterAuth({
    appName: "GriffamDev",
    baseURL: config.baseURL,
    secret: config.secret,
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    trustedOrigins: [config.baseURL],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
        prompt: "select_account",
        accessType: "online",
        includeGrantedScopes: false,
      },
    },
    account: { accountLinking: { enabled: false }, encryptOAuthTokens: true },
    user: { changeEmail: { enabled: false }, deleteUser: { enabled: false } },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: true, window: 60, max: 30 },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isOwner(user, config.ownerEmail))
              throw new APIError("FORBIDDEN", {
                message: "This account is not authorized.",
              });
            return { data: user };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const user = await db.query.user.findFirst({
              where: (user, { eq }) => eq(user.id, session.userId),
            });
            if (!user || !isOwner(user, config.ownerEmail))
              throw new APIError("FORBIDDEN", {
                message: "This account is not authorized.",
              });
            return { data: session };
          },
        },
      },
    },
  });
}
