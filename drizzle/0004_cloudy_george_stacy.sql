CREATE TABLE "booking_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"settings" jsonb NOT NULL,
	"version" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
