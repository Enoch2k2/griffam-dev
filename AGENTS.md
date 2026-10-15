<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## GriffamDev project conventions

Read `docs/development.md` for module boundaries, test placement and commit practices.
Use focused conventional commits and `codex/` branches. Keep route handlers thin;
colocate feature tests, and use Node for backend tests and jsdom for UI tests.
Run `npm run check` before committing code changes. Never include credentials,
generated reports, or unrelated user edits in a commit.

## Delivery workflow

For each new work item, create a fresh `codex/<topic>` branch from up-to-date
`origin/main`. Do not mix unrelated work or branch from unmerged work unless the
dependency is explicit. Continue the same branch for fixes to its open PR.
Commit focused changes, push the branch, and create or update a GitHub PR.
The user has authorized this workflow for future project work. Do not push directly
to main, merge PRs, or bypass checks without explicit authorization.
Check GitHub Actions results and report any failures. Attach created PRs to the task.
CI is active; CD requires a confirmed hosting target and credentials. Do not claim
an artifact upload or production build is a deployment.
