CREATE TABLE "booking_request_limit" (
	"bucket" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD CONSTRAINT "booking_reservation_status" CHECK ("booking_reservation"."status" in ('held', 'provisioning', 'needs_review', 'confirmed', 'cancelled'));--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD CONSTRAINT "booking_reservation_confirmed_effects" CHECK ("booking_reservation"."status" <> 'confirmed' or ("booking_reservation"."zoom_meeting_id" is not null and "booking_reservation"."zoom_join_url" is not null and "booking_reservation"."google_event_id" is not null and "booking_reservation"."confirmed_at" is not null));--> statement-breakpoint
ALTER TABLE "email_job" ADD CONSTRAINT "email_job_single_subject" CHECK (num_nonnulls("email_job"."inquiry_id", "email_job"."booking_id") = 1);