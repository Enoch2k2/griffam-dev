# Sprint 3 — Public website

Status: public-site and inquiry email PRs are merged. Owner confirmed immediate real email delivery on 2026-10-23. Content review and the resume remain.

## Delivered

- Services and process copy, working contact form, and honest resume-unavailable state.
- Selected work: Flatiron School Flask Project Generator (Creator), Griffam Finance
  (Owner), and GriffamDev (ongoing engineering project). The first two descriptions,
  roles and outcomes were supplied by Enoch on 2026-10-20. No invented usage metrics,
  employment claims or financial outcomes. Flatiron handoff does not claim continued adoption.
- Existing About page, portrait, social links and light/dark wordmark remain in place.
- Validated inquiries persisted in PostgreSQL with an additive migration. Identical
  retries use one submission ID and produce one record; changed content using the
  same ID is rejected. Success is shown only after persistence is confirmed.
- Owner-only `/admin/inquiries`, ordered newest first, with 20 messages per page.
  Authorization runs before every database read. Private messages render as escaped text.
- Body size limits, exact-origin checks, honeypot and database-backed hourly limits
  (3 per normalized email, 60 overall). Concurrent submissions are serialized with
  a transaction advisory lock. Limits persist across restarts.
- UI interaction tests, HTTP boundary tests and real PostgreSQL concurrency tests.

## Operational behavior

Run `npm run db:migrate` before starting the new build (existing Render start command
already does this). No production migration is applied by local tests. The inquiry
endpoint requires DATABASE_URL and the correct BETTER_AUTH_URL origin.

The inbox remains the source of truth. Optional Resend owner notifications and visitor
receipts now use a transactional database outbox and an authenticated scheduled worker.
Delivery stays disabled until credentials, sender DNS and the scheduler are configured.
See [email setup and recovery](../email-notifications.md). Booking confirmations remain
part of the planned booking/notifications work.

The honeypot and rate limits are basic spam controls, not bot identity verification.
A malicious sender can exhaust the global hourly allowance. Reassess abuse controls
and define retention/deletion policy before accepting real public inquiries.

## Remaining acceptance

- Owner review of public copy and project descriptions.
- Resume PDF from the owner; there is no fake download button. Upload management is Sprint 4.
- Immediate sends: verified by the owner on 2026-10-23.
- Inquiry persistence and email journey: confirmed working by the owner after deployment.
- Complete outstanding operational recovery checks from Sprint 2 before public launch.
- Booking, publishing and chess remain explicitly planned, not functioning features.

The site remains noindex pending launch review.

## Verification (2026-10-20)

- `TEST_DATABASE_URL=<isolated local database> npm run check`: lint, types,
  **63 tests across 12 files**, and production build passed.
- Production build served on port 3101 against a task-only local PostgreSQL database:
  browser submission showed success and created exactly one row. A signed test owner
  session read it; an anonymous request contained no private inquiry. Owner response
  included `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.
- Desktop light and mobile dark Work layouts inspected, plus mobile contact form.
- These checks do not claim live Google OAuth or production email delivery coverage.
