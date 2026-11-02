CREATE TABLE "calendar_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"encrypted_refresh_token" text,
	"account_email" text,
	"connected_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"state_hash" text,
	"encrypted_verifier" text,
	"state_expires_at" timestamp with time zone
);
