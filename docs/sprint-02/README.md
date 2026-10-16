# Sprint 2 — Foundation

Status: foundation implemented; Neon production branch connected and migrated.
Render deployment and real Google sign-in remain unverified until hosting and OAuth
credentials are configured. The website has not launched.

## Decisions

- Drizzle ORM + node-postgres: typed queries, explicit SQL migrations and PostgreSQL transactions.
- Better Auth: database-backed sessions and Google OAuth for owner access. Public
  registration, passwords and account linking are disabled. Google owner sign-in is confirmed; Calendar scopes are not requested.
- The exact verified Google email in server-only `ADMIN_EMAIL` is the owner policy.
  It is checked on user/session creation and every admin request; no client-provided
  role can grant access. Future client accounts require a separate role/ownership design.
- Render Free serves Next.js UI and backend; Neon Free stores PostgreSQL data.
- Background jobs remain deferred until a durable runner is selected. Sleeping web
  instances must never schedule reminders with process timers.

## Implemented foundation

- Four auth tables, foreign keys, unique email/token/provider-identity constraints,
  generated migration and migration history. Feature tables arrive with their features.
- Lazy database/auth initialization so public pages build without credentials.
- `/admin/sign-in`, protected `/admin`, sign-out and a protected `/api/admin/session`
  read boundary. Future admin reads and writes must call the access check themselves;
  a page guard alone does not protect nested APIs or Server Actions.
- Auth configuration fails closed, database session checks bypass cookie caching,
  OAuth tokens are encrypted by the library, and client redirects are fixed local paths.
- Real PostgreSQL integration tests plus UI and server boundary tests in CI.
- Render Blueprint and an operator runbook; configuration is not a live deployment.

## Remaining exit criteria

- Google owner sign-in is confirmed; configure Google OAuth client credentials.
- Connect Render, verify a development URL and the Google callback end to end.
- Demonstrate rejected non-owner sign-in, logout and recovery against the deployed service.
- Verify CI-gated deployment, migration failure behavior and rollback procedure.
- Provision isolated PR previews if needed; automatic previews are deliberately absent
  until environment/database isolation is configured. Never copy live credentials to PR code.
- Review Neon backup/recovery and paid Render requirements before public launch.

Sprint 1 scheduling details (actual hours, timezone, buffer placement and remaining
policies) stay open; they do not block this foundation and must be settled before booking.

See [deployment and recovery](../deployment.md) for setup and verification.
