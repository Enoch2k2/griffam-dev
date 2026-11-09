# Sprint 5 — Custom booking

Status: owner availability and Google Calendar connection are merged. Enoch confirmed
that the real Calendar test passes after reactivating Google Workspace. Public
availability browsing is merged; the current slice adds internal reservation
storage and conflict protection. Online reservations remain disabled.
See [Google Calendar setup](../google-calendar.md).

## Public availability browsing

Enoch confirmed a 30-day browsing window on 2026-11-04. `/book` loads available
30-minute calls on demand from `/api/booking/availability`. Visitors can choose a
time zone or use their browser's zone; dates are grouped in the selected zone.
The horizon is today plus 29 days in the owner's zone. The existing 24-hour notice,
working hours, closed dates and buffers still apply.

Only saved owner hours are published. Each request reads current settings and Google
free/busy; failures return a generic unavailable response, never an empty busy list.
Responses are not cached and contain only candidate start/end times, the calculation
time and window length. Provider credentials, owner identity and busy intervals are
not returned. The query covers local-day boundaries with buffer padding across DST.

This is read-only browsing: no holds, bookings, event writes or emails. Times can
change; reservation work must recheck Google and local reservations at submission.
Public endpoint rate limiting and request coalescing remain launch-hardening work.
No new environment variables, scopes or migrations are required.

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

1. Validate the public availability view against the owner’s real calendar after deployment.
2. Visitor calendar, timezone display, details/review flow and transactional slot
   reservations. Recheck external conflicts; never claim atomicity across Google
   Calendar and PostgreSQL. Add idempotent event creation and recovery/reconciliation.
3. Confirmation email, secure expiring management links, Zoom/Calendar cancellation,
   cancellation notice, and a durable 24-hour reminder are implemented on the current
   stacked PR. Rescheduling, admin recovery for partial cancellations, and live provider
   reconciliation remain.
4. Verify migrations and run disposable-database provider/race tests, then complete one
   controlled real-provider booking/cancellation before public launch.

Confirmed: cancellations require at least 24 hours' notice; reminders go out 24 hours
before calls; the existing worker polls every 15 minutes. Enoch selected a separate Zoom
meeting per booking; see [Zoom preparation](../zoom-booking.md). The browsing horizon is
30 days. Additional calendars remain an open question.

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

## Reservation foundation (not publicly enabled)

The internal `holdReservation` service validates contact details and a canonical UTC
slot, rechecks saved hours plus fresh external busy intervals, and creates a ten-minute
hold. No public mutation endpoint or confirmation button is introduced in this slice.
A required provider dependency must make the real Google read when wired to the API.

An owner-wide transaction lock serializes holds with schedule saves. PostgreSQL also
excludes overlapping occupied ranges, including the 30-minute buffer, as defense in
depth. Limits allow up to three new holds per normalized email and 60 globally per
hour. Repeated identical request IDs return the original hold without extending it;
changed details conflict. Expired IDs cannot silently create a new hold. Owner email
and provider tokens are never returned by this service.

Expired holds stop blocking public availability and are cancelled before inserting
new holds. Provisioning, confirmed and needs-review records continue blocking until
explicitly reconciled; they must not expire after an ambiguous provider outcome.
These states are reserved for the next workflow, not evidence of provider completion.
The database cannot atomically prevent somebody independently adding a Google event
between the external read and a local commit; final provisioning must recheck/recover.

Migration 0006 adds the reservation table and custom SQL CHECK/range-exclusion
constraints (preserve these when editing generated migrations). Tested on disposable
local PostgreSQL and schema-only Neon branch `dev-booking-reservations`, expiring
2026-11-11. Production and local credential configuration were not changed.
