CREATE TABLE "inquiry" (
	"id" text PRIMARY KEY NOT NULL,
	"request_hash" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"service" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inquiry_created_idx" ON "inquiry" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inquiry_email_created_idx" ON "inquiry" USING btree ("email","created_at");