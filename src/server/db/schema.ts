import {
  boolean,
  check,
  integer,
  jsonb,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { Availability } from "@/features/booking/availability";
import type { Article } from "@/features/content/validation";
import type { EmailPayload } from "../email/templates";

const date = (name: string) => timestamp(name, { withTimezone: true });

export const post = pgTable("post", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  version: integer("version").notNull().default(1),
  published: jsonb("published").$type<Article>(),
  publishedAt: date("published_at"),
  updatedAt: date("updated_at").notNull().defaultNow(),
}, table => [index("post_published_idx").on(table.publishedAt)]);

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
  inquiryId: text("inquiry_id").references(() => inquiry.id, { onDelete: "cascade" }),
  bookingId: text("booking_id").references(() => bookingReservation.id, { onDelete: "cascade" }),
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
  index("email_job_booking_idx").on(table.bookingId),
  check("email_job_single_subject", sql`num_nonnulls(${table.inquiryId}, ${table.bookingId}) = 1`),
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

export const bookingAvailability = pgTable("booking_availability", {
  id: text("id").primaryKey(),
  settings: jsonb("settings").$type<Availability>().notNull(),
  version: integer("version").notNull(),
  updatedAt: date("updated_at").notNull().defaultNow(),
});

export const calendarConnection = pgTable("calendar_connection", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  accountEmail: text("account_email"),
  connectedAt: date("connected_at"),
  eventWriteGranted: boolean("event_write_granted").notNull().default(false),
  revision: integer("revision").notNull().default(1),
  stateHash: text("state_hash"),
  encryptedVerifier: text("encrypted_verifier"),
  stateExpiresAt: date("state_expires_at"),
});

// Holds are internal until meeting provisioning and confirmation are wired.
export const bookingReservation = pgTable("booking_reservation", {
  id: text("id").primaryKey(),
  requestHash: text("request_hash").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  timeZone: text("time_zone").notNull(),
  notes: text("notes").notNull(),
  startsAt: date("starts_at").notNull(),
  endsAt: date("ends_at").notNull(),
  occupiedUntil: date("occupied_until").notNull(),
  status: text("status").notNull().default("held"),
  expiresAt: date("expires_at").notNull(),
  provisioningToken: text("provisioning_token"),
  provisioningAt: date("provisioning_at"),
  zoomMeetingId: text("zoom_meeting_id"),
  zoomJoinUrl: text("zoom_join_url"),
  googleEventId: text("google_event_id"),
  lastError: text("last_error"),
  confirmedAt: date("confirmed_at"),
  managementTokenHash: text("management_token_hash"),
  managementTokenExpiresAt: date("management_token_expires_at"),
  createdAt: date("created_at").notNull().defaultNow(),
}, table => [
  index("booking_reservation_email_created_idx").on(table.email, table.createdAt),
  uniqueIndex("booking_reservation_management_token_hash_idx").on(table.managementTokenHash),
  check("booking_reservation_status", sql`${table.status} in ('held', 'provisioning', 'needs_review', 'confirmed', 'cancellation_pending', 'cancelled')`),
  check("booking_reservation_confirmed_effects", sql`${table.status} <> 'confirmed' or (${table.zoomMeetingId} is not null and ${table.zoomJoinUrl} is not null and ${table.googleEventId} is not null and ${table.confirmedAt} is not null)`),
]);

export const bookingRequestLimit = pgTable("booking_request_limit", {
  bucket: text("bucket").primaryKey(),
  attempts: integer("attempts").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
});
