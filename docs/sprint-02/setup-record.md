# Setup record — 2026-10-16

## Agent tooling and account configuration

- Installed/updated the global `neon` CLI using the owner-supplied command.
- The first `neon init -y` installed the Neon plugin at user scope for detected
  Codex, Cursor and VS Code installations. Retrying with `--agent codex` limited
  the second setup pass to Codex. No separate per-project MCP configuration was added.
- Fetched https://neon.com/.well-known/agent-skills/neon/SKILL.md and verified it
  matches the installed skill. Read the Neon and neon-postgres skills and verified
  the recommended driver for Render: node-postgres over TCP.
- Confirmed an existing global Codex Neon MCP entry and preserved it, including
  its authentication configuration. The enabled Neon plugin also bundles an OAuth
  MCP definition. No additional standalone MCP entry or copied skills were needed.
  MCP tools are available, but a read-only describe-project call returned 404 for
  the selected project. Its authentication must be reconnected with the GriffamDev
  account; CLI credentials and MCP credentials are independent.
- Initial project linking failed because the CLI was using the personal account,
  which was not an organization member. At the owner's request, revoked/removed
  that CLI OAuth profile and signed in as enoch.griffith@griffamdev.dev.
- Retried initialization against organization `org-little-grass-69301282`, project
  `calm-smoke-53086671`, branch `production`; linking succeeded.

## Workspace and service changes

- Added generated `neon.ts`, Neon config/env dependencies and lockfile entries.
  PostgreSQL is the only declared service; managed Neon Auth is disabled because
  owner authentication is implemented in the Next.js application with Better Auth.
- Created ignored `.neon` project context and added `.neon` to `.gitignore`.
- Pulled DATABASE_URL, DATABASE_URL_UNPOOLED and NEON_BRANCH into ignored `.env.local`.
  Added the confirmed owner email, local auth origin and a generated auth secret
  only where absent; restricted file permissions. No credentials were committed.
- `neon config plan` and `neon deploy` reported no remote policy changes: the existing
  branch already matched the PostgreSQL-only policy. Deploy refreshed local variables.
- Applied the versioned Drizzle auth migration to the requested Neon branch: four
  auth tables plus indexes/constraints and migration history. No client data added.
- Added a non-persistent read/write/rollback verification script and a generic
  database readiness endpoint; neither exposes connection strings or user records.

## Verification and remaining work

Validation completed locally:

```text
neon deploy: No changes — branch production already matches the policy.
Database migrations applied.
PostgreSQL read/write/rollback check passed. No verification data retained.
npm run check: 38 tests passed; lint/typecheck/build passed.
npm run build: Compiled successfully; generated 22 routes.
GET /api/health -> 200 {"status":"ok"}
GET /api/ready -> 200 {"status":"ready"}
GET /api/admin/session -> 503 while OAuth is unconfigured
GET /api/auth/get-session -> 503 while OAuth is unconfigured
Browser /admin -> /admin/sign-in; no owner data exposed
npm audit --omit=dev: found 0 vulnerabilities
```

The production server ran locally on port 3100 against Neon. This is not a Render
deployment. The PostgreSQL integration suite used disposable local databases,
never the linked Neon production branch.
Google OAuth client credentials are still missing, so no live Google callback or
owner login is claimed. Render service creation and hosted deployment remain pending.
A pg driver warning notes future changes to `sslmode=require` semantics; current
pinned pg uses certificate verification. No TLS verification was disabled.

The new Drizzle CLI dependency brought an old transitive esbuild advisory; a scoped
esbuild override to 0.25.12 fixes it. The existing ESLint/brace dependency advisory
remains in development tooling. Do not apply a forced framework downgrade.
