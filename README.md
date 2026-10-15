# GriffamDev

Enoch Griffith — Full Stack Software Engineer.

Local project skeleton for griffamdev.dev. Next.js App Router, React, TypeScript,
Tailwind CSS, and planned PostgreSQL persistence. No live services are connected.

## Run locally

Use Node.js 22 (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js. No environment variables or database are
required for the current static pages.

```sh
npm run check
npm run lint
```

`check` generates route types, checks TypeScript, and creates a production build.
`npm start` serves that build. Dependencies are locked in package-lock.json.

## Optional local database

With Docker installed, `npm run db:up` starts PostgreSQL on localhost:5432.
Copy `.env.example` to `.env.local` when database integration starts.
`npm run db:down` stops the database without deleting its volume.
The supplied credentials are for local development only. The app does not yet
connect to this database; schema, migrations, and data access are Sprint 2 work.

## Structure

- `src/app/(public)` — shared public layout and website routes.
- `src/app/(account)` — sign-in and dashboard placeholders.
- `src/app/(management)` — admin placeholder; no management actions or private data.
- `src/components` — reusable site header, footer, and placeholder page.
- `src/config/site.ts` — verified identity, domain, LinkedIn, and navigation.
- `docs/architecture.md` — boundaries and implementation decisions.
- `docs/sprints.md` — agreed delivery sequence and remaining acceptance criteria.

## Current scope

Working navigation, responsive public shell, homepage, About, and clearly labeled
placeholder pages for services, projects, blog, videos, resume, mentoring,
booking, AI chess, sign-in, dashboard, and administration. The contact page links
to Enoch's real LinkedIn; no email address, resume, client results, or credentials
have been invented. The wordmark and G favicon are temporary until the logo arrives.

Authentication, authorization, content persistence, forms, bookings, calendar
sync, email sending, payments, playable chess, and AI chat are NOT implemented.
The scaffold must not be treated as a protected client portal. Route groups do
not provide access control. No user data is collected. Search indexing is disabled
in root metadata until the public launch review.

## Verification notes

The generated Next.js ESLint toolchain currently reports a transitive `braces`
advisory (five linked high-severity audit entries). Do not downgrade Next.js or
apply `npm audit fix --force` blindly. Recheck the advisory and compatible tooling
updates before launch. Production dependencies should be audited separately.
