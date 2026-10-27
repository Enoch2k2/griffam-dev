# Sprint 4 — Publishing

Status: the first publishing slice is merged. Editor usability improvements are on `codex/blog-editor-controls`; merge and deployment pending.
Media and resume management are the next slice, not delivered by this change.

## Owner workflow

1. Sign in and open `/admin/posts` (also linked from the admin dashboard).
2. Add a 3–120 character title. A new article slug follows the title until you customize it or save. Use Generate from title to regenerate an unpublished URL. Titles with no usable Latin letters/numbers need a manually entered slug. Duplicate URLs return a conflict so you can choose another.
3. Add a short summary and write in the single Markdown body box. Select text and use H1/H2/H3, bold, italic, quote, list, code or link buttons, or type Markdown directly. Replace the example link URL before publishing. H1 Markdown renders as a prominent section heading beneath the article title.
4. Save a draft and use Preview to inspect it. Neither action publishes it.
5. Publish when ready. The article appears at `/learn/blog/<slug>` and in the blog list.
6. Save further edits privately; Publish changes explicitly replaces the live snapshot.
7. Unpublish removes public access while retaining the editable draft.

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
- Bundled images under `/images/blog/` render with alt text and optional captions. External images, raw HTML and embedded media are disabled. No MDX execution or shared draft URLs.
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

## Editor usability follow-up

Inspired by [Medium’s selection-based formatting](https://help.medium.com/hc/en-us/articles/215194537-Using-the-story-editor), with a visible wrapping toolbar and one Markdown body input. This is still the publishing sprint; it does not add a rich-text storage format or a new CMS dependency. Existing saved URLs do not change when a title changes. Title constraints are shared between browser and API. Existing titles longer than 120 characters must be shortened before saving again.

Validation for the editor follow-up: lint, typecheck, 116 tests across 20 files,
and production build passed. Browser verified automatic slugs, heading insertion,
selection retention and the dark toolbar in a local production build.

Testing setup note: an initial migration invocation set DATABASE_URL locally but
left the configured DATABASE_URL_UNPOOLED in effect, so it ran against the configured
Neon connection. This change introduces no migrations. Both variables were then set
to the disposable local database before the browser fixture was created. Always set
both variables when using the migration CLI for local verification.

## Illustrated sample article

Open `/admin/posts/example` as the owner, or follow the sample link on New article.
The sample contains an original article about GriffamDev and two bundled SVG
illustrations. It is an unsaved starting point: preview, edit, then Save draft.
It does not seed production, replace an existing article or publish automatically.

Use `![Accessible description](/images/blog/filename.svg "Optional caption")`.
Only simple filenames in the bundled blog directory are rendered (SVG, PNG, JPG,
WebP); remote URLs and traversal paths are rejected. General image uploads remain
a later slice. The original SVG illustrations are versioned with the site and
require no storage account or image subscription.

Verification (2026-10-26): `npm run check` passed lint, types, 119 tests across
21 files and the production build. Integration tests used disposable local
PostgreSQL. Browser preview confirmed both images and captions; Save draft
succeeded locally. No production draft or publication was created.
