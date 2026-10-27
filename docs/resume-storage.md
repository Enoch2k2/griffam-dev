# Resume uploads

The owner uploads a PDF at `/admin/resume`. The button explicitly publishes it:
visitors download the current PDF through `/api/resume`, linked from `/resume`.
Files survive Render restarts because they live in Neon Object Storage, not the
Render filesystem. Blog media uploads remain a separate follow-up.

## Storage and replacement

`neon.ts` declares a private `griffamdev-documents` bucket. Only the fixed
`resume/current.pdf` key is served by the application; the download endpoint takes
no file path from visitors. Uploading replaces the current object after a successful
S3 write. There is no version-history or restore UI; retain the previous PDF locally.
Concurrent owner uploads use last-completed-write wins. Downloads use attachment
headers and no-store to avoid caching an older resume.

Owner authorization and exact-origin checks run before writes. The request is read
with a 5 MiB limit independent of Content-Length. PDF header/end-marker checks reject
obviously invalid/truncated files; they are not malware scanning or full PDF parsing.
Upload only trusted PDFs. The filename served to visitors is fixed. Credentials stay
on the server. Failed/uncertain uploads direct the owner to check the current download
before retrying. Storage outages are distinct from an empty/unconfigured resume.

## Render configuration

The private production bucket was provisioned on 2026-10-27. Production credentials
are saved in ignored `.env.resume-production` (mode 600); `.env.local` was preserved.
For reference, these are the provisioning commands (already completed):

```sh
neon config plan --project-id calm-smoke-53086671 --branch production
neon deploy --project-id calm-smoke-53086671 --branch production --no-env-pull
neon env pull --project-id calm-smoke-53086671 --branch production --service object-storage --file .env.resume-production
```

Add the values from that private, ignored file to Render (do not paste secrets into
GitHub, a PR, or chat):

- `RESUME_ENABLED=true`
- `AWS_ENDPOINT_URL_S3`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Use production credentials, never the expiring test branch. `NEON_BRANCH` is not
required by the app. Keep existing database, auth and email settings unchanged.
No database migration is added by this feature. Before configuration, the public
resume page retains its honest unavailable state and the admin uploader is disabled.
After deployment/configuration, upload the owner's actual PDF and verify its download.
Set `RESUME_ENABLED=false` and redeploy to withdraw access without deleting the file.

## Development

Tests use mocked provider responses for authorization, validation, limits and failures;
UI tests check selected-file upload, disabled state and failure recovery. Live provider
checks must target an isolated storage branch and use a visibly labeled test PDF.
The temporary `dev-resume-management` branch expires on 2026-11-02. Its S3 environment
is in ignored `.env.resume-test`; the existing `.env.local` is preserved.

When starting a test app, explicitly override both DATABASE_URL and
DATABASE_URL_UNPOOLED with the disposable local database. Set both before running
`db:migrate`. Never run migrations with only one connection variable overridden.

## Verification (2026-10-27)

- `npm run check`: lint, typecheck, 132 tests across 23 files and production build passed.
- Download endpoint is request-time (`ƒ`), so replacements do not require rebuilding.
- Live Neon storage on `dev-resume-management`: empty download returned 404;
  owner browser upload succeeded; anonymous download returned 200 with identical
  bytes. A second owner upload replaced the download with the new bytes.
- Anonymous upload returned 403; an expired test owner session also rejected writes.
- Public resume page displayed its PDF download link after upload.
- Production bucket remains empty. Render variables and the real PDF remain owner setup.
