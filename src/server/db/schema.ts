import {
  boolean,
  integer,
  jsonb,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { EmailPayload } from "../email/templates";

const date = (name: string) => timestamp(name, { withTimezone: true });

export const inquiry = pgTable(
  "inquiry",
  {
    id: text("id").primaryKey(),
    requestHash: text("request_hash").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    service: text("service").notNull(),
    message: text("message").notNull(),
    createdAt: date("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("inquiry_created_idx").on(table.createdAt),
    index("inquiry_email_created_idx").on(table.email, table.createdAt),
  ],
);

export const emailJob = pgTable("email_job", {
  id: text("id").primaryKey(),
  inquiryId: text("inquiry_id").notNull().references(() => inquiry.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  payload: jsonb("payload").$type<EmailPayload>().notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: date("available_at").notNull().defaultNow(),
  firstAttemptAt: date("first_attempt_at"),
  leaseUntil: date("lease_until"),
  leaseToken: text("lease_token"),
  providerId: text("provider_id"),
  lastError: text("last_error"),
  createdAt: date("created_at").notNull().defaultNow(),
}, table => [
  index("email_job_due_idx").on(table.status, table.availableAt),
  index("email_job_inquiry_idx").on(table.inquiryId),
]);

export const user = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: date("created_at").notNull().defaultNow(),
  updatedAt: date("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "auth_session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: date("expires_at").notNull(),
    createdAt: date("created_at").notNull().defaultNow(),
    updatedAt: date("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("auth_session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "auth_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: date("access_token_expires_at"),
    refreshTokenExpiresAt: date("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: date("created_at").notNull().defaultNow(),
    updatedAt: date("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("auth_account_user_idx").on(table.userId),
    uniqueIndex("auth_account_provider_identity_idx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable(
  "auth_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: date("expires_at").notNull(),
    createdAt: date("created_at").notNull().defaultNow(),
    updatedAt: date("updated_at").notNull().defaultNow(),
  },
  (table) => [index("auth_verification_identifier_idx").on(table.identifier)],
);
