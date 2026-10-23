# Architecture

## Chosen foundation

Next.js App Router with server components by default, React, strict TypeScript,
Tailwind CSS, npm lockfile, and PostgreSQL. Keep a single application initially.
Neon PostgreSQL, Render and Google owner OAuth are configured. The canonical
site URL is https://www.griffamdev.dev. Public launch acceptance remains open.

## Build ourselves

Public design; content administration and publishing workflows; client/student
screens; booking UI and availability rules; calendar synchronization; notification
queue and templates; chess interface and conversation orchestration; mentoring workflows.

## Use dependable primitives

Use Better Auth for owner Google sign-in and database-backed sessions; Drizzle ORM
and node-postgres for queries and versioned SQL migrations.
Use Google Calendar API for free/busy and events, a chess rules library and engine
for legal moves, a language model for conversation, an email provider for delivery,
and a payment processor for payments. Inquiry email uses a Resend adapter and PostgreSQL outbox; live configuration is pending. Calendar, AI and payments remain future work.

## Feature boundaries to add as implementation begins

- `src/features/booking`: availability, reservations, cancellation/rescheduling.
- `src/features/content`: drafts, publishing, public content queries.
- `src/features/chess`: game state, engine adapter, AI context.
- `src/features/mentoring`: offerings, purchases, access and resources.
- `src/server`: database, auth, external adapters, jobs; server-only imports.

Do not create unused services or fake provider responses just to fill these folders.

## Data and security requirements

PostgreSQL owns website booking/payment state; Google supplies external calendar
availability and receives appointment events. Model sync states and recoverable
failures explicitly. Reserve slots transactionally, recheck calendar availability,
and reconcile external edits; free/busy plus event insert is not an atomic booking.
Persist email jobs with booking changes, use idempotency and retry policies, and
cancel obsolete reminders after changes. Confirm paid appointments only after a
verified payment event, with reservation expiration and recovery rules.

Authorization belongs on every server-side read and mutation. Separate public
published content from drafts and private client data. Admin access checks the configured verified owner on every request. Client dashboard
routes remain inert until their authentication and ownership checks exist. Keep Google
refresh tokens and all API credentials server-side. Validate uploaded content,
file size/type, and render article content safely.

Chess must remain playable if AI chat fails. Validate moves through the rules
engine; ground explanations in current position and analysis. Rate-limit AI calls
and enforce budgets. Never expose model credentials to the browser.

## Hosting decision

Use Render Free for the Next.js Node web service (public UI and backend together)
and Neon Free for managed PostgreSQL during development. Provider setup and deployment verification are tracked in `docs/sprint-02/README.md`. Keep the optional
local PostgreSQL setup for development and isolated database tests.

Before client-facing launch, review an always-on paid Render service, database
backup/recovery needs, and usage limits. Free hosting does not provide the durable
worker execution required for reliable reminders: choose and verify a job runner
before enabling notifications. Do not use in-process timers in a sleeping service.
Media/object storage, email delivery and AI remain separate provider decisions.

## Open decisions

File hosting;
email provider and background worker; editor; chess engine deployment/licensing;
AI provider/model; durable job execution and deployment configuration. Resolve these in their relevant sprint.
