# Sprint 4 — Publishing

Status: first slice implemented on `codex/blog-publishing`; merge and deployment pending.
Media and resume management are the next slice, not delivered by this change.

## Owner workflow

1. Sign in and open `/admin/posts` (also linked from the admin dashboard).
2. Create an article with a title, URL slug, short summary and Markdown body.
3. Save a draft and use Preview to inspect it. Neither action publishes it.
4. Publish when ready. The article appears at `/learn/blog/<slug>` and in the blog list.
5. Save further edits privately; Publish changes explicitly replaces the live snapshot.
6. Unpublish removes public access while retaining the editable draft.

Save before leaving; there is no autosave. A browser close/reload warning helps with
unsaved edits, but internal navigation is not blocked. A saved permalink reopens the
editor. Concurrent edits return a conflict rather than overwrite a newer version;
copy your text before reopening the saved article. Published slugs are locked until
unpublishing, so a draft save cannot accidentally change a live URL. Changing a slug
after unpublishing does not create a redirect from the old URL.

## Boundaries

- Custom editor, persistence and publishing workflow; `react-markdown` renders Markdown.
- Separate draft fields and published snapshot; public queries never select draft text.
- Owner authorization before reads/writes, exact-origin checks, bounded request bodies,
  version checks and unique slugs. Public and owner lists paginate at 20 articles.
- Raw HTML, embedded media and images are disabled. No MDX execution or shared draft URLs.
- No new environment variables. The additive `0003` migration creates the post table;
  the existing Render startup migration command applies it after merge/deployment.
- No example articles or test users are inserted into production.

## Verification (2026-10-23)

- `TEST_DATABASE_URL=<isolated local database> npm run check`: lint, typecheck,
  **108 tests across 19 files**, and production build passed.
- PostgreSQL tests exercise draft isolation, publication snapshots, unpublishing,
  concurrent writes, slug conflicts and bounded public reads.
- Browser checked a production build against disposable local PostgreSQL: save,
  preview, publish, private edits without changing the live article, reopen saved
  draft, unpublish and public not-found page. Desktop dark layout inspected.
- An expired local test owner session correctly rejected a write; renewing the
  test session restored access. These checks do not exercise live Google OAuth.
- Dependency audit reports five high findings in the existing ESLint dependency
  chain (braces via micromatch/fast-glob). No forced downgrade of the Next lint
  configuration was applied. Track an upstream-compatible fix separately.

## Remaining Sprint 4 work

- Merge/deploy and owner acceptance of the editor with a real article.
- Durable media and resume storage; Render's ephemeral filesystem cannot retain uploads.
- Resume PDF supplied by the owner, upload validation and replacement workflow.
- Article-specific SEO metadata, images/video support and responsive acceptance.
- Review search indexing at launch; the existing noindex policy remains.
