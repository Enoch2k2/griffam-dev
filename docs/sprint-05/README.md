# Sprint 5 — Custom booking

Status: started. The first slice adds owner availability settings and a schedule
preview. It does not expose bookable slots, connect Google Calendar, or create
appointments. The public booking page remains a planned-feature page.

## Confirmed by Enoch (2026-10-27)

- Free 30-minute discovery calls.
- Monday–Friday, 9 AM–4 PM, America/Chicago; weekends unavailable.
- Minimum notice: 24 elapsed hours.
- 30-minute buffer after each call.

Calls must finish within working hours. The final candidate is 3:30–4 PM; its buffer
may extend past 4 PM. These are the starting values displayed in the owner form;
click Save availability to persist them. No production settings are seeded.

## First slice: owner schedule

`/admin/availability`, linked from Admin, manages one same-day opening interval per
weekday plus full-day exceptions (YYYY-MM-DD in the owner time zone). All days can
be disabled. Split shifts and overnight hours are not supported in this version.

Save persists to PostgreSQL; version checks reject stale edits, including racing
first saves. Save before leaving; the form does not autosave. Owner authorization
runs before reads and writes. Writes check origin and bound the request body.

The seven-day preview uses current form values and the time the page loaded.
Reload for a fresh time baseline. It does not save, check Google busy times or
reserve anything. Candidate slots are alternatives; adjacent candidates cannot
both be booked once the buffer is applied.

The calculation accepts external busy intervals and local appointment intervals
for later integration. It preserves local working hours across DST, skips ambiguous
or nonexistent start/end times, checks actual 30-minute duration, applies 24-hour
notice, and removes buffer conflicts. Busy intervals include a 30-minute buffer
after their end; candidates also require room for their own after-call buffer.
Invalid busy intervals throw instead of silently yielding availability. A failed
Google request must never be represented by an empty busy list in the public flow.

## Remaining booking slices

1. Owner Google Calendar connection with encrypted tokens, disconnect/reconnect,
   scoped consent and free/busy checks. Existing Google sign-in does not grant this.
2. Visitor calendar, timezone display, details/review flow and transactional slot
   reservations. Recheck external conflicts; never claim atomicity across Google
   Calendar and PostgreSQL. Add idempotent event creation and recovery/reconciliation.
3. Booking confirmation emails through the existing outbox, secure management links,
   cancellation/rescheduling, reminders and failure recovery.
4. End-to-end provider and race tests before enabling public booking.

Still to confirm: booking horizon, cancellation/rescheduling deadline, reminder
schedule, meeting location/Google Meet, and which calendars block availability.
The current preview horizon is not a published booking policy.

## Deployment and validation

An additive `booking_availability` migration runs through the existing deployment
migration command. No new Render variables or Google scopes are needed for this slice.
Local integration tests use a disposable PostgreSQL database. The migration is also
tested on schema-only Neon branch `dev-booking-availability`, expiring 2026-11-03;
production data and `.env.local` stay unchanged. Its ignored `.env.availability-test`
file is only for isolated verification, never for Render.

Verification: `npm run check` passed lint, typecheck, 144 tests across 27 files,
and production build. Browser verified confirmed hours, weekend exclusion, preview
and successful save against disposable local PostgreSQL. Migration also passed on
the isolated Neon branch. Schema-only branches omit migration-history rows, so the
four already-existing migrations were recorded there before applying migration 0004;
no production migration or settings write was performed.
