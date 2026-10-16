# GriffamDev

Enoch Griffith — Full Stack Software Engineer.

Project foundation for griffamdev.dev. Next.js App Router, React, TypeScript,
Tailwind CSS, and PostgreSQL persistence through Drizzle. Neon PostgreSQL is connected; Render and Google OAuth setup are pending.

## Run locally

Use Node.js 22 (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js. No environment variables or database are
required for public pages. Owner sign-in requires the settings in `.env.example`.

```sh
npm run check
npm run lint
```

`check` runs lint, generates route types, checks TypeScript, runs tests with coverage,
and creates a production build.
`npm start` serves that build. Dependencies are locked in package-lock.json.

## Tests and project conventions

See [development conventions](docs/development.md) for structure, test layers and commits.
Run `npm test` for all tests, `npm run test:watch` during development,
`npm run test:ui` for React tests, or `npm run test:server` for Node tests.
`npm run test:coverage` generates a scoped V8 report in `coverage/`.
CI runs the full check and retains coverage reports.

`GET /api/health` provides process liveness only; it does not check database or
external-service readiness. `GET /api/ready` checks the database and migrated user table without returning data.
PostgreSQL integration tests run in CI; browser OAuth verification needs credentials.

## Hosting direction

Selected development hosting: Render Free for the Next.js app and backend, with
Neon Free for PostgreSQL. CD setup remains pending.
See [architecture](docs/architecture.md) for launch and background-job decisions.

## Optional local database

With Docker installed, `npm run db:up` starts PostgreSQL on localhost:5432.
Copy `.env.example` to `.env.local` when database integration starts.
`npm run db:down` stops the database without deleting its volume.
The supplied credentials are for local development only. Run `npm run db:migrate` to create the auth schema. See
[deployment and recovery](docs/deployment.md) for environment settings and integration tests.

## Structure

- `src/app/(public)` — shared public layout and website routes.
- `src/app/(account)` — sign-in and dashboard placeholders.
- `src/app/(management)` — admin placeholder; no management actions or private data.
- `src/components` — reusable site header, footer, and placeholder page.
- `src/config/site.ts` — verified identity, domain, LinkedIn, and navigation.
- `docs/architecture.md` — boundaries and implementation decisions.
- `docs/sprints.md` — agreed delivery sequence and remaining acceptance criteria.
- `docs/sprint-01/README.md` — Sprint 1 review packet, wireframes, backlog and decisions.

## Current scope

Working navigation, responsive public shell, homepage, About, and clearly labeled
placeholder pages for services, projects, blog, videos, resume, mentoring,
booking, AI chess, sign-in, dashboard, and administration. The contact page links
to Enoch's real LinkedIn; no email address, resume, client results, or credentials
have been invented. The wordmark and G favicon are temporary until the logo arrives.

Owner-only Google authentication and server authorization are implemented but require
provider configuration and live OAuth verification. Public accounts, content publishing,
forms, bookings, calendar sync, email sending, payments, playable chess and AI chat
are NOT implemented.
The scaffold must not be treated as a protected client portal. Route groups do
not provide access control. Configured owner sign-in stores the owner profile and session records. Search indexing is disabled
in root metadata until the public launch review.

## Verification notes

The generated Next.js ESLint toolchain currently reports a transitive `braces`
advisory (five linked high-severity audit entries). Do not downgrade Next.js or
apply `npm audit fix --force` blindly. Recheck the advisory and compatible tooling
updates before launch. Production dependencies should be audited separately.
