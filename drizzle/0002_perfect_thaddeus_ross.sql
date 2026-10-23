CREATE TABLE "email_job" (
	"id" text PRIMARY KEY NOT NULL,
	"inquiry_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_attempt_at" timestamp with time zone,
	"lease_until" timestamp with time zone,
	"lease_token" text,
	"provider_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_job" ADD CONSTRAINT "email_job_inquiry_id_inquiry_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_job_due_idx" ON "email_job" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "email_job_inquiry_idx" ON "email_job" USING btree ("inquiry_id");