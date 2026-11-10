ALTER TABLE "booking_reservation" DROP CONSTRAINT "booking_reservation_status";--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD CONSTRAINT "booking_reservation_status" CHECK ("booking_reservation"."status" in ('held', 'provisioning', 'needs_review', 'confirmed', 'cancellation_pending', 'cancelled'));
--> statement-breakpoint
ALTER TABLE "booking_reservation" DROP CONSTRAINT "booking_reservation_state_check";--> statement-breakpoint
ALTER TABLE "booking_reservation" DROP CONSTRAINT "booking_reservation_no_overlap";--> statement-breakpoint
ALTER TABLE "booking_reservation" ADD CONSTRAINT "booking_reservation_no_overlap"
EXCLUDE USING gist (tstzrange("starts_at", "occupied_until", '[)') WITH &&)
WHERE ("status" IN ('held', 'provisioning', 'confirmed', 'cancellation_pending', 'needs_review'));
