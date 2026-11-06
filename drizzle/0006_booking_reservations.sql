CREATE TABLE "booking_reservation" (
	"id" text PRIMARY KEY NOT NULL,
	"request_hash" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"time_zone" text NOT NULL,
	"notes" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"occupied_until" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'held' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "booking_reservation_email_created_idx" ON "booking_reservation" USING btree ("email","created_at");--> statement-breakpoint
-- One owner calendar: range exclusion requires no btree_gist extension.
-- Expired holds are cancelled under the reservation lock before a new insert.
ALTER TABLE "booking_reservation" ADD CONSTRAINT "booking_reservation_state_check"
CHECK (status IN ('held', 'provisioning', 'confirmed', 'needs_review', 'cancelled'));
--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD CONSTRAINT "booking_reservation_duration_check"
CHECK (ends_at = starts_at + interval '30 minutes' AND occupied_until = ends_at + interval '30 minutes');
--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD CONSTRAINT "booking_reservation_no_overlap"
EXCLUDE USING gist (tstzrange(starts_at, occupied_until, '[)') WITH &&)
WHERE (status IN ('held', 'provisioning', 'confirmed', 'needs_review'));
