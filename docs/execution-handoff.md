# GriffamDev execution handoff

Prepared November 6, 2026. Implementation paused at Enoch's request so another model
can execute this plan. This document is a plan, not a claim that the unfinished
booking flow works. Do not restart from a blank scaffold.

## 1. Start here

- Repository: `Enoch2k2/griffam-dev`.
- Workspace: `/Users/thundosasmac/Documents/ChatGPT/GriffamDev freelance website`.
- Current branch: `codex/booking-confirmation`, based on merged PR #21 / main commit
  `9188f87`. Its current implementation changes are **uncommitted**. No PR has been
  opened for this branch yet.
- Preserve the pre-existing user edit to `docs/zoom-booking.md`. It was already
  modified before this task started (one added/removed line). Do not overwrite,
  stage, or include that edit in the implementation commit without reviewing its
  ownership with the user. Agent-authored new setup guidance is in
  `docs/booking-providers.md` instead.
- Read `AGENTS.md`, `docs/development.md`, and relevant installed Next.js docs in
  `node_modules/next/dist/docs/` before editing. Next.js 16.4.1 uses Cache Components;
  adding a route `runtime` export previously caused a build error.
- Continue this branch for this work item; it contains related unfinished work.
  For later work items, create fresh `codex/` branches from current `origin/main`.
- Use focused conventional commits, run `npm run check`, push, open a PR, attach
  the PR to the task, and inspect GitHub CI. Never merge or push directly to main
  without explicit authorization. The user normally merges PRs.
- No production booking, meeting, event or email was created by this unfinished work.
  Do not interpret provider mocks or a production build as a live deployment test.

## 2. Product decisions already made

- Enoch Griffith, Full Stack Software Engineer, GriffamDev.
- Canonical deployment: `https://www.griffamdev.dev`; Render service
  `griffamdev.onrender.com`, ID `srv-dba4lm5g1s2s73ap0abg`; Neon PostgreSQL.
- Keep existing self-hosted Better Auth, Drizzle, node-postgres and Resend outbox.
- Discovery calls: free, 30 minutes; Monday–Friday 9 AM–4 PM America/Chicago;
  24 elapsed hours' notice; 30-minute buffer after calls; 30-day browsing window.
- Call must end within working hours; its buffer may extend beyond closing time.
- Each confirmed call gets a **separate Zoom meeting**, not a reusable link and not
  Google Meet. Google Calendar remains the availability/event system.
- Google owner account: `enoch.griffith@griffamdev.dev`. Calendar access was fixed
  by reactivating Workspace. The owner confirmed the real free/busy test succeeds.
- Text `GriffamDev.` branding is preferred over the animated logo.
- A playable AI chess/chat experience is required at launch.
- Still undecided: cancellation/rescheduling cutoff, reminder timing, whether
  calendars other than the owner's primary calendar should block availability.
  Ask these when their slice begins; do not invent business policies.

## 3. What is already merged

- Site foundation, owner authentication, public content/project pages, inquiry
  persistence and instant Resend inquiry emails, publishing/editor and resume work.
- Custom owner availability, Google Calendar OAuth and encrypted refresh tokens.
- Public `/book` can browse available times in a selectable time zone. It does not
  yet accept bookings.
- PR #20 removed the Calendar test button and cleaned up connection controls.
  The owner-only diagnostic endpoint still exists.
- PR #21 added `holdReservation` and reservation persistence, expiry, idempotency,
  persistent per-email/global hold limits, and a PostgreSQL range exclusion that
  includes the buffer. Public availability excludes active local holds.
- PR #21 validation: 186 tests, lint, types and build passed locally; additive
  migration 0006 was tested on isolated local PostgreSQL and schema-only Neon.

## 4. Current unfinished code inventory

Three agents worked on separate areas. Two reached a usage limit. Preserve their
files, but review and integrate them; their individual reports are not full-system
validation. All changes are visible in the shared working directory.

### Visitor UI

Files: `src/features/booking/call-times.tsx`, `booking-form.tsx`, related tests and
CSS module, and `src/app/(public)/book/page.tsx`.

- Conditional slot selection, contact details, review, explicit confirmation.
- Preserves UUID and reviewed payload for uncertain retries; pending is explicitly
  not confirmed. Only a matching confirmed response ID is accepted.
- Provider join URL is checked before display. Review URL validation consistency
  with stricter server/email rules.
- Agent reported 9 focused UI tests passed.
- Limitation to resolve or deliberately document: retry identity is currently kept
  in React memory only. Reload loses it. Avoid a new submission creating a second
  meeting after an unknown result; consider session-scoped recovery with appropriate
  handling of personal data, or an explicit recovery path.

### Provider adapters

Files: `src/server/zoom/meetings.ts` and tests; `src/server/calendar/events.ts` and
 tests; `google.ts`/tests; new `docs/booking-providers.md`.

- `readZoomConfig()`, `createZoomMeeting(config,{id,start,end})`,
  `getZoomMeeting(config,meetingId,expected)`.
- Zoom creates scheduled meetings with waiting room/passcode, no PMI, no automatic
  recording; only participant join URL is returned. An opaque booking reference in
  the agenda supports manual recovery. Adopt verifies identity/time/host.
- `ensureCalendarEvent(config,refreshToken,{id,start,end,joinUrl})` and
  `calendarEventId(id)` provide deterministic event IDs and recovery of ambiguous
  inserts. No attendee invitations; confirmation emails are separate.
- `CALENDAR_EVENTS_ENABLED=true` requests `calendar.events.owned` in addition to
  free/busy. `exchangeCode` returns `eventWriteGranted`.
- Parent changed callback/store to persist that flag; schema defaults it to false.
  Existing saved free/busy credentials must not count as write-ready.
- Agent reported 14 focused provider tests passed. Final agent turn was interrupted;
  inspect final files and rerun tests. No live credentials/provider writes tested.

### Confirmation emails

Files: `src/server/email/booking.ts` and tests, `booking-immediate.test.ts`,
`worker.ts`, `immediate.ts`, `tests/integration/email.test.ts`.

- `enqueueBookingEmails(tx,{id,email,start,end,timeZone,joinUrl},config)` inserts
  deterministic owner/client jobs atomically with confirmation.
- `scheduleBookingEmails(id)` is the immediate latency optimization. Scheduled
  outbox draining remains the durable fallback.
- Worker keeps inquiry compatibility; adds booking filtering (`drainEmail` fifth
  argument, `claimEmail` third argument).
- Participant Zoom link validation is stricter than the UI (zoom.us /j/ path,
  optional pwd only). Ensure adapters actually produce compatible links.
- Agent reported 18 focused tests and 10 disposable PostgreSQL email integration
  tests passed before the last schema addition. Rerun after final migration changes.

### Owner recovery UI (partial)

Files: `src/app/(management)/admin/bookings/page.tsx`,
`src/features/booking/booking-recovery.tsx`, `bookings-admin.module.css`, admin nav.

- Shows latest 50 requests and distinguishes confirmed from pending/review.
- Offers calendar resume for known Zoom meetings; adoption by meeting ID for an
  unknown outcome; explicit owner acknowledgment before releasing a failed hold.
- These controls currently target a **missing backend endpoint**. Agent stopped
  before completing/reporting tests. Review accessibility, expired-hold presentation,
  safe URL display, stale data and action states before accepting this work.

### Schema/migration (incomplete synchronization)

- `schema.ts` adds reservation provisioning token/time, Zoom ID/join URL, Google
  event ID, fixed last-error code, confirmation time; Calendar write-grant boolean;
  nullable inquiry reference and new booking reference on email jobs.
- Generated `drizzle/0007_booking_confirmation.sql`, snapshot and journal exist.
- **After generation**, parent added `bookingRequestLimit` table to schema.ts.
  Therefore 0007/snapshot currently do NOT represent the full schema. Finish the
  schema and regenerate the unpublished migration consistently (or add a clear
  follow-up migration). Never change already-deployed 0006.
- Add an email-job constraint requiring exactly one of inquiryId/bookingId. Consider
  a confirmed-reservation constraint requiring persisted provider IDs/join URL.
  Preserve custom exclusion/state/duration constraints from 0006.
- Known likely type error: `tests/server/calendar.test.ts` mocked `exchangeCode`
  result needs `eventWriteGranted`. Search for other mocks affected by the change.

## 5. Execute booking confirmation in this order

### A. Finish shared contracts and readiness

Create a server-only booking readiness/config layer requiring:

1. Explicit `BOOKING_ENABLED=true` (default off).
2. Valid Calendar config and `CALENDAR_EVENTS_ENABLED=true`.
3. Saved owner connection with `eventWriteGranted=true`.
4. Valid Zoom configuration and existing email configuration.
5. Saved owner availability.

Return `bookingEnabled:boolean` from the availability endpoint. Missing/off must
leave browse-only behavior. A config flag alone is not live provider verification.
Don't enable production automatically.

Public endpoint expected by UI: `POST /api/booking/reservations`.
Payload: `{id,start,name,email,timeZone,notes,website}` using existing reservation
validation and honeypot. Origin-check, enforce JSON and a streamed body-size limit,
validate before provider work, and return no-store responses. Add a bounded,
database-backed request budget before costly provider calls; existing hold limits
alone don't limit failed/invalid expensive attempts. Do not trust spoofable headers
as the sole abuse control. Bound/clean rate-limit storage.

Responses already expected by UI:

- 200 `{status:'confirmed',id,start,end,timeZone,joinUrl,emailQueued:true}`.
- 202 `{status:'pending',id,message}` for an unresolved outcome, never confirmation.
- 400/409/429/503 `{error}`. Keep uncertain retries on the same ID/payload.
- Existing hold/hash mismatch must not expose another visitor's details or link.

### B. Build durable orchestration and recovery

Use the merged hold service. Recheck external conflicts before provisioning. Claim
one provisioner atomically with a token; fence every subsequent write by that token.
Do not allow a simultaneous public retry or owner recovery to provision twice.

Suggested state progression:
`held -> provisioning -> confirmed`; ambiguous effects -> `needs_review`;
only definitely safe failures or explicit owner cleanup -> `cancelled`.

- Persist a known Zoom ID/join URL immediately after creation, **before** Google
  writes and the confirmation/email transaction.
- Persist a known Google event ID before final confirmation. A failed final DB/email
  transaction must not discard provider identity and trigger duplicate creation.
- Zoom timeout/network failure may hide a successful create. Do not automatically
  repeat create. Keep the time blocked and route to owner review.
- Google uses deterministic event IDs; recover/verify an existing event instead of
  inserting another or overwriting unrelated content.
- Only after both provider effects are verified: update confirmed state AND enqueue
  both emails in one transaction. Then invoke immediate delivery optimization.
- Public retries can return existing confirmed state or pending; they must not extend
  a hold or silently create new meetings. Inspect expired held IDs explicitly.
- A worker/process crash during provisioning must remain visible and recoverable.
  A stale worker cannot overwrite recovery or confirm after an owner released it.
- PostgreSQL and Google cannot commit atomically. Document the race with external
  Calendar edits; use final checks and recovery, not claims of absolute atomicity.

Owner endpoint expected by partial UI: `POST /api/admin/bookings/recover` with
`{id,action:'resume'|'adopt'|'release',meetingId?,acknowledged?}`. Require owner auth,
exact origin and bounded input. Resume only known persisted Zoom meetings. Adoption
must verify the existing meeting with the adapter. Release only stale/review,
unconfirmed records after explicit acknowledgment of external cleanup. Protect
against active workers with an atomic claim/fencing strategy; elapsed two minutes
alone is not sufficient proof a worker cannot still complete.

### C. Integrate and verify

- Review agent code and contract mismatches before adding more features.
- Test backend auth, origin/body limits, readiness, rate limits, request-ID ownership,
  expired holds, conflicts and provider errors without raw secret logging.
- Real DB tests: competing visitors, duplicate submissions, concurrent recovery,
  stale-worker fencing, crashes at each provider persistence boundary, atomic email
  enqueue/confirmation and retry behavior.
- Provider mocks: auth failure, timeout after possible create, malformed responses,
  mismatched recovered meeting/event, deterministic Google recovery.
- UI: keyboard flow, timezone/date changes, review, double-click, 409 refresh,
  network-unknown retry, pending review and owner recovery actions.
- Run `npm run check` against a disposable local `_test` database. Do not point
  TEST_DATABASE_URL at production. Migration scripts prefer DATABASE_URL_UNPOOLED;
  override both URL variables when invoking migrations locally.
- Follow Neon skill branch-first migration validation. Use a fresh schema-only
  branch to avoid copying sensitive rows. Never overwrite .env.local or production
  CLI context by pulling a test branch into it. No active branch for 0007 has been
  created yet. The previous reservation test branch expires November 11.
- Verify mobile/dark/light UI in the browser. Do not invent live success if credentials
  are missing. Keep private logs/keys/host start URLs out of output.
- Commit only this work, push, open/update PR, attach it and inspect CI. Report actual
  failures or pending checks. The current unfinished tree has NOT passed full check.

### D. Provider setup and controlled deployment

Use `docs/booking-providers.md` for exact setup. Proposed Zoom variables:
`ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_HOST_USER_ID`.
Scopes currently documented: meeting create + read. Future cancellation adds its
own scope. Never request secrets in chat. Do not assume the Zoom app is configured.

The owner must grant Google event-write consent using Reconnect after the updated
scope is configured. Existing free/busy consent is insufficient. Retain the working
Google sign-in callback and existing Calendar callback URLs.

After user merge, CI and Render deployment, coordinate a controlled booking with the
owner's own email. Enabling booking and sending real confirmations must be intentional.
Verify exactly one Zoom meeting, one correctly timed Google event, owner/client emails,
and no duplicate on retry. Verify provider failure/pending recovery. Record any real
provider checks still untested. Do not claim CI artifacts are deployments.

## 6. Remaining booking slices after confirmation

1. Secure client management links and/or authenticated own-booking management.
2. Cancellation: provider deletes, availability release, durable notifications and
   safe recovery if only one provider succeeds. Confirm cutoff policy first.
3. Rescheduling: preserve the old confirmed booking until replacement is safe;
   handle competing slots and provider failures without losing both appointments.
4. Reminders: confirm timing, use durable jobs; prevent stale reminders after changes.
5. Operational polish: provider health, recoverable errors, email delivery/retry
   visibility, monitoring, retention, and endpoint abuse/load checks.
6. Full real-provider E2E and race testing before broadly announcing booking.

## 7. Broader roadmap to public launch

Follow existing `docs/sprints.md` and the sprint checklists; audit what's actually
finished rather than treating every scaffold as delivered.

| Order | Work | Acceptance |
| --- | --- | --- |
| Finish Sprint 5 | Booking and management above | Book/confirm/change/cancel without silent inconsistencies |
| Sprint 6 | Chess engine and accessible responsive UI | Legal complete games, difficulty, side choice, history, restart/resign |
| Sprint 7 | Position-aware AI chat/coaching | Accurate board context, server-only credentials, cost/rate limits, graceful failure |
| Publishing/content polish | Blog image uploads/SEO, final projects/about/resume/socials, videos as appropriate | Real content, usable uploads, mobile/accessibility, no misleading placeholders |
| Sprint 8 launch | Integrated notifications, operational checks, SEO/indexing, backups, monitoring, dependency review | Booking plus playable AI chess verified on live site |
| Sprint 9 | Client/student accounts and portal | Users only access their own profile/bookings; verification/recovery tested |
| Sprint 10 | Paid mentoring | Offerings, payment verification, holds, refund/cancellation policy and resources |

AI chess is explicitly a launch requirement. Voice chat, saved games, advanced
analysis and a full project/file workspace are deferred unless Enoch changes scope.
Client portal and paid mentoring are currently post-launch in the sprint plan; don't
silently move them into launch without discussing that scope change.

## 8. Delegation guidance for the next model

The user authorized agents working together. Existing agent turns are finished or
stopped; do not assume they are still working. The next model can work locally or
redelegate narrow tasks. Suggested boundaries: provider review/recovery tests,
visitor/admin UI tests, email regression tests; coordinator owns schema, orchestration,
public/admin endpoints, final integration and delivery. Agree on contracts before
parallel edits. All agents share this directory, so never overlap file ownership or
let agents switch branches/commit independently without coordination.

## Suggested continuation prompt

"Read docs/execution-handoff.md and inspect the existing uncommitted changes on
codex/booking-confirmation. Preserve my existing edit to docs/zoom-booking.md.
Complete and test the booking confirmation integration in section 5, using separate
Zoom meetings, Google Calendar events and durable confirmation emails. Keep public
confirmation disabled until provider setup and controlled verification are complete.
Use focused commits, push and open a PR; do not merge. Tell me exactly which provider
setup steps remain and distinguish mocked/local checks from live verification."
