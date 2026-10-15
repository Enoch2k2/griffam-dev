# Prioritized implementation backlog

P0 = launch requirement; P1 = post-launch. No story is claimed implemented by
this document. Sprint numbers match the agreed sequence in ../sprints.md.

| ID | Priority / Sprint | Story | Acceptance criteria | Dependencies |
| --- | --- | --- | --- | --- |
| GD-01 | P0 / 1 | Confirm scope and policies | Owner reviews wireframes and confirms audience, hours, time zone and booking rules; unresolved items are recorded | Owner input |
| GD-02 | P0 / 2 | Establish data layer | Versioned migrations apply to empty PostgreSQL; constraints and rollback/recovery procedure documented; secrets absent from client bundles | Technical tool selection |
| GD-03 | P0 / 2 | Protect administration | Unauthenticated reads/writes denied; authenticated non-admin denied; provision initial owner outside public registration; recovery tested | GD-02, auth selection |
| GD-04 | P0 / 2 | Validate delivery pipeline | CI builds/typechecks from lockfile; preview deploys without production secrets; environment and worker execution documented | Hosting decision |
| GD-05 | P0 / 3 | Publish professional presence | All approved public pages work on mobile/keyboard; exact name/title; real links and content; resume absent state or working PDF | Approved assets/copy |
| GD-06 | P0 / 3 | Accept project inquiries | Server validation and abuse limits; persist inquiry; submit idempotently; delivery failure never loses inquiry; success/error states accessible | GD-02, email adapter |
| GD-07 | P0 / 4 | Publish articles and projects | Draft save, authenticated preview, publish/unpublish; public queries exclude drafts; unsafe markup rejected/sanitized; slug collisions handled | GD-03 |
| GD-08 | P0 / 4 | Manage media and resume | Authorized uploads validate type/size; replacement failure preserves old resume; video pages accept approved embeds and descriptions | GD-03, storage choice |
| GD-09 | P0 / 5 | Connect owner calendar | Owner-only OAuth; state validation; encrypted refresh token storage; least-required scopes; disconnect/reconnect handled | GD-03, Google configuration |
| GD-10 | P0 / 5 | Calculate availability | Combine approved working rules, exceptions, local reservations and Google busy times; test DST boundaries, buffers and notice | GD-01, GD-09 |
| GD-11 | P0 / 5 | Confirm consultation | Server rechecks slot; concurrent requests cannot confirm same local interval; retries do not duplicate events; partial failures surface pending state | GD-10 |
| GD-12 | P0 / 5 | Manage appointments | Scoped expiring links; policy enforcement; cancellation/rescheduling reconcile calendar, local state and reminder jobs; external edits reconciled | GD-11 |
| GD-13 | P0 / 6 | Play complete chess games | Legal moves including castling/en passant/promotion; checkmate/stalemate/draw handling; side/difficulty, history, resign/restart; keyboard/mobile interaction | Rules/engine choice and license review |
| GD-14 | P0 / 7 | Converse during chess | Server receives validated position/history; chat answers reference correct position; engine owns moves; chat failure does not stop play | GD-13, AI evaluation |
| GD-15 | P0 / 7 | Bound AI usage | Server-side input/output limits, timeouts, concurrency and rate limits; daily spend ceiling/circuit breaker; credentials never exposed | GD-14, budget decision |
| GD-16 | P0 / 8 | Deliver notifications | Transactional outbox; duplicate-job protection; retries/backoff; confirmed/change/cancellation messages; reminder times update after rescheduling; delivery failure visible to admin | GD-11, GD-12, worker/email choices |
| GD-17 | P0 / 8 | Launch reliably | Complete booking and chess journeys verified; accessibility/mobile review; HTTPS/domain; backups/recovery; dependency review; production noindex removed only after approval to launch | GD-04 through GD-16 |
| GD-18 | P1 / 9 | Client/student accounts | Verification/recovery, appointment ownership, timezone settings, useful dashboard, cross-user authorization tests | GD-03, booking data model |
| GD-19 | P1 / 10 | Paid mentoring | Offerings and approved policies; expiring slot holds; verified payment events; idempotent fulfillment; failed/late payments and refunds reconciled | GD-18, payment provider |

## Verification strategy

Unit tests: timezone/availability rules, reservation expiry, reminder eligibility,
game state context validation. Database integration tests: overlapping reservations,
idempotency, public-vs-draft queries and ownership. Provider contract tests use
controlled fixtures and separately verified sandbox flows. End-to-end tests cover
book -> email -> reschedule -> cancel, content draft -> publish, and complete chess
game plus AI outage. Verify mobile and keyboard paths, not only screenshot appearance.

## Sprint 2 entry gate

Confirm architecture tooling and owner-auth setup; choose development/preview
infrastructure and environment handling. Core schema work can start independently
of final marketing copy, but scheduling rules must remain configurable until approved.
