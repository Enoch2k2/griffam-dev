# Development hosting and owner access

Selected providers: Render Free + Neon Free. Neon project `calm-smoke-53086671`
(`GriffamDev Website`) is linked to its `production` branch at the owner's request.
PostgreSQL is connected and migrated; Render and Google OAuth setup remain pending.
The public website stays noindex until launch review.

## Local setup

1. Use Node from `.nvmrc`, run `npm ci`, and start PostgreSQL with `npm run db:up`.
2. Copy `.env.example` to `.env.local`. Keep all real values out of source control.
3. Run `npm run db:migrate`, then `npm run dev`.
4. Public pages work without OAuth credentials. `/admin` redirects to the owner
   sign-in page; missing/invalid auth configuration disables sign-in and returns
   503 from auth/admin APIs. Client/student sign-in remains a placeholder.

## Neon

`neon.ts` declares PostgreSQL only; existing self-managed Better Auth is preserved.
`neon deploy` reconciles Neon services and pulls DATABASE_URL, DATABASE_URL_UNPOOLED
and NEON_BRANCH into ignored `.env.local`. It does not deploy the Next.js website.
The local `.neon` context is ignored too. Future feature work should use isolated Neon
branches; do not point integration tests at the linked production branch.


For a new environment, create a separate database/branch. Choose a region close
to the Render service. The selected Neon project is in AWS us-east-2. Set `DATABASE_URL` to Neon's pooled connection string and
`DATABASE_URL_UNPOOLED` to its direct connection string, preserving TLS settings.
Do not disable certificate verification in application code. The migrator uses a
session advisory lock, so its URL must be direct, not transaction-pooled.

The runtime pool has at most five connections per process. Each environment needs
its own database/branch and credentials. Preview data must contain no client records
or owner OAuth tokens. Test scripts never use `DATABASE_URL` as a fallback.

## Google owner sign-in

Create a Web application OAuth client in Google Cloud. Configure the consent screen
and add the owner as a test user if the application is in testing mode. Request only
identity scopes; Calendar authorization is a later, separate feature.

Set server-only variables:

- `ADMIN_EMAIL`: exact email of the owner's Google account, not a domain wildcard.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: OAuth credentials.
- `BETTER_AUTH_SECRET`: a randomly generated secret of at least 32 characters;
  generate locally with `openssl rand -base64 48` and save privately.
- `BETTER_AUTH_URL`: exact origin, such as `http://localhost:3000` locally or the
  service's HTTPS origin on Render. Never include a path or query string.

Register `<BETTER_AUTH_URL>/api/auth/callback/google` as an authorized redirect URI.
`localhost` and `127.0.0.1` are different origins: use the one matching configuration.
Also register the eventual deployed callback before attempting hosted sign-in.

The first successful verified Google sign-in for `ADMIN_EMAIL` provisions the owner.
Other identities cannot provision users or create sessions. Email/password signup
and account linking are disabled. All admin requests recheck the current owner policy.
No provider tokens or session tokens are returned by `/api/admin/session`.

## Render

After the PR is merged, connect the GitHub repository and create a Blueprint from
`render.yaml`. Review that the service is Free and supply the requested server-only
settings through Render. The Blueprint creates no Render database or paid worker.
The generated auth secret should remain stable across deployments.

The build runs `npm ci --include=dev && npm run build`. Startup applies committed
migrations using the direct connection, then starts Next.js on Render's port. This
avoids paid pre-deploy hooks; failed migrations prevent startup. Only reviewed,
backward-compatible migrations belong in this flow because the previous application
may still be running. Migration locks serialize simultaneous starts.

Automatic deploys are configured for `main` after CI checks pass. Initial Blueprint
creation, manual deployments and configuration changes still require operator review;
CI gating does not replace that review. `/api/health` is process liveness only.
Keep Blueprint auto-sync under operator control when reviewing infrastructure changes.

Automatic PR previews are not enabled. For a trusted preview, create a separate
service and Neon database/branch, unique auth secret and explicit OAuth callback.
Never let untrusted PR code access shared credentials. Verify current free quotas
before creating additional services. Do not connect griffamdev.dev yet.

## Verification before calling deployment complete

- Confirm the deployed commit matches the reviewed merge and successful CI run.
- Check the home page, themes, `/api/health`, `/api/ready` and owner sign-in.
- Run `npm run db:verify`: read/write a unique verification row in a transaction,
  roll back and confirm nothing remains. This uses the same pooled app connection.
- Check guest access redirects and unauthorized API access returns 401 (503 while unconfigured).
- Sign in as the configured owner; check admin access and sign-out.
- Verify a different Google account is rejected and an external callback URL fails.
- Revoke a session in the database and confirm its old cookie no longer authorizes access.
- Verify migrations rerun without losing data and a failed migration blocks startup.
- Observe a CI failure preventing an automatic deploy; document the actual service URL.

## Migrations, rollback and recovery

Change `src/server/db/schema.ts`, run `npm run db:generate`, review SQL and commit
both SQL and Drizzle metadata. Apply with `npm run db:migrate`. Never edit applied
migration history or use schema-push commands against shared environments.

Prefer additive migrations, deploy compatible code, backfill, then remove obsolete
columns in a later release. Application rollback can redeploy the previous commit
only if its schema remains compatible. There is intentionally no destructive down
migration command. For data loss, stop writes, restore a verified backup into a new
database, validate it, then change connection settings. Test that recovery before
collecting real client data; Neon Free is not an assumed backup guarantee.

Owner recovery: recover the Google account through Google. If the authorized account
must change, verify its ownership outside the website, update `ADMIN_EMAIL` in the
host settings, revoke existing sessions (`DELETE FROM auth_session` using a trusted
DB console), and redeploy before signing in with the replacement account. Never
provide a public admin-grant endpoint. Back up the auth secret securely: changing it
invalidates signed sessions and can make existing encrypted OAuth tokens unreadable.

## Database tests

CI starts PostgreSQL 17 and passes `TEST_DATABASE_URL`. Locally use a separate
connection whose database name ends in `_test`; the test role needs CREATEDB.
The suite creates a randomly named database, applies migrations, tests constraints,
auth hooks and signed-session behavior, then drops only that temporary database.

```sh
TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/griffamdev_test npm run check
```

Without this variable, local tests explicitly skip the integration suite; CI fails
if it is missing. Real Google consent/callback behavior needs the hosted smoke test;
local integration fixtures do not claim to verify Google itself.

## References

- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Better Auth Google provider](https://better-auth.com/docs/authentication/google)
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Render Blueprint reference](https://render.com/docs/blueprint-spec)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
