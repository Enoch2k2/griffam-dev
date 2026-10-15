# Development conventions

## Structure

Keep `src/app` focused on routes, layouts, metadata, and thin HTTP adapters.
Shared UI belongs in `src/components`; shared public configuration in `src/config`.
As features are implemented, create `src/features/<feature>` for domain logic and
feature-specific UI. Put database, authorization, providers and jobs in `src/server`
and enforce server-only boundaries. Do not import server code into client components.
Create these modules when they have real responsibilities, not as empty scaffolding.

Colocate UI tests as `*.test.tsx` next to their components and pure/domain tests as
`*.test.ts` next to their implementation. Use `tests/server` for HTTP contracts and
cross-module server tests. Shared browser setup lives in `tests/setup/ui.ts`.
Avoid generic utility folders, catch-all services, and unnecessary abstractions.

## Test layers

- Vitest UI project: jsdom, React Testing Library, user-event, jest-dom matchers.
  Query by accessible role/name and test observable interactions, not implementation snapshots.
- Vitest server project: native Node environment with Request/Response; no DOM mocks.
  The initial health test calls the handler directly; it is not a live HTTP E2E test.
- Future PostgreSQL integration tests: isolated disposable test database, migrations,
  ownership constraints, transactions and concurrent bookings. Never point tests at production.
- Future Playwright E2E: running Next.js app, navigation/hydration, async server components,
  calendar and booking journeys. Not installed or claimed covered by the initial test suite.

Mock third-party APIs at their adapter boundary; keep unit tests offline and free of
secrets. Add real database tests when persistence is implemented, rather than mocking
SQL and claiming integration coverage. Vitest does not cover async React Server
Components; test their extracted logic and verify the rendered journey with E2E.

## Commands

```sh
npm test                  # All tests, one run (CI-safe)
npm run test:watch        # Interactive watch mode
npm run test:ui           # UI suite only
npm run test:server       # Server suite only
npm run test:coverage     # V8 report: terminal, coverage/index.html and lcov
npm run check            # Lint, typecheck, tests, production build
```

Coverage currently targets the theme toggle and API handlers, not the whole site.
Expand coverage scope as executable feature logic is added; do not interpret this
report as proof that planned features exist or that visual layouts are tested.

## Commits and branches

Use `codex/<focused-topic>` branches and small commits with a single purpose.
Use descriptive Conventional Commit prefixes (`feat:`, `fix:`, `test:`, `docs:`,
`chore:`). Keep unrelated refactors out of fixes. Review the staged diff, run relevant
checks, and include lockfile changes with dependency changes. Never commit secrets,
local environment files, generated coverage, or build output. Do not amend someone
else's work or force-push shared history.

For each new work item, start a fresh branch from current `origin/main`, push focused
commits and open a PR. This workflow is authorized by the project owner. Keep fixes
to an existing PR on its branch. If dependent work must stack on an unmerged PR,
explicitly document its base and dependency. Do not merge or push directly to main
without authorization. Verify remote CI before declaring a PR ready.

## CI and continuous deployment

GitHub Actions runs on pushes and PRs: clean dependency installation, lint,
TypeScript, UI/server tests with coverage, and production build. Coverage reports
are retained as artifacts; these are not deployments. Runs have a time limit and
superseded runs for the same branch/PR are cancelled.

CD is pending the owner's hosting selection and credentials. Proposed flow:
PR -> checks + isolated preview -> review -> merge -> checks -> production deployment.
Production deployment should only occur from main after checks pass, with scoped
secrets and appropriate environment approvals. Do not run untrusted PR code with
production credentials. Provider configuration, preview URLs, smoke checks and
rollback procedure must be verified before describing CD as active.

Repository branch protection is not configured by these files. Require the
`check` job and PR review on main when repository settings/plan permit it.

## Definition of done

Relevant behavior and failure cases tested; lint/typecheck/build pass; accessible
interaction preserved; documentation updated for changed workflows; staged diff
reviewed. Record untested integrations and unresolved advisories honestly.
