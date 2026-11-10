ALTER TABLE "booking_reservation" ADD COLUMN "management_token_hash" text;--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD COLUMN "management_token_expires_at" timestamp with time zone;