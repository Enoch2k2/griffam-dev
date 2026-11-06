ALTER TABLE "email_job" ALTER COLUMN "inquiry_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD COLUMN "provisioning_token" text;--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD COLUMN "provisioning_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD COLUMN "zoom_meeting_id" text;--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD COLUMN "zoom_join_url" text;--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD COLUMN "google_event_id" text;--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_connection" ADD COLUMN "event_write_granted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_job" ADD COLUMN "booking_id" text;--> statement-breakpoint
ALTER TABLE "email_job" ADD CONSTRAINT "email_job_booking_id_booking_reservation_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking_reservation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_job_booking_idx" ON "email_job" USING btree ("booking_id");
