# Inquiry email notifications

Status: owner confirmed real email delivery on 2026-10-23. New inquiries now schedule
an immediate attempt after the form response; the durable worker remains the recovery
path. Keep the enable switch and scheduler configured. No Google/Gmail configuration is replaced.

## Setup after the PR is merged and deployed

1. Create a Resend account. Add and verify `notifications.griffamdev.dev` under
   Domains, using the exact DNS records provided by Resend. Keep the root domain's
   Google Workspace MX and verification records. Do not invent or duplicate SPF records.
2. Create a Sending access API key restricted to that verified domain.
3. In Render, add these server-only variables:
   - `RESEND_API_KEY`: the private restricted API key.
   - `EMAIL_FROM=hello@notifications.griffamdev.dev` (a bare email address).
   - `EMAIL_WORKER_SECRET`: a new random secret of at least 32 characters. Generate
     with `openssl rand -hex 32`; do not reuse the auth secret or paste it in chat.
   - Keep `EMAIL_ENABLED=false` until the scheduler is configured.
   - Existing `ADMIN_EMAIL=enoch.griffith@griffamdev.dev` is the notification
     recipient and the visitor receipt's Reply-To.
   - Existing `BETTER_AUTH_URL=https://www.griffamdev.dev` must stay canonical.
4. Under the repository's Settings → Secrets and variables → Actions:
   - Secret `EMAIL_WORKER_SECRET`: same value as Render.
   - Variable `EMAIL_WORKER_URL=https://www.griffamdev.dev/api/internal/email`.
   - Variable `EMAIL_WORKER_ENABLED=true`.
5. Set Render `EMAIL_ENABLED=true` and deploy. Startup applies the additive migration.
   In Actions, run **Process inquiry emails** manually on main. An empty batch should
   return zero counts. Unauthorized calls return 401; unconfigured delivery returns 503.
6. Submit an inquiry using an email address you control. Run the workflow again.
   Confirm both emails arrive, the reply addresses are correct, and the inbox shows
   both jobs accepted. Repeat the workflow to verify no duplicate send.

After a successful inquiry transaction, Next.js `after` attempts its two emails without
blocking the saved response. It processes only that inquiry and uses the same lease,
idempotency and retry rules as the scheduled worker. Repeated form submissions cannot
bypass backoff or resend accepted jobs. This best-effort attempt is not a promise of
instant delivery: Render restarts, API errors and recipient mail processing can delay it.

The recovery workflow runs at minutes 7, 22, 37 and 52 each hour, on main only. It makes one
authenticated POST; it has no database/API-key access and checks out no code.
Each scheduled run processes at most five pending emails. Increase recovery capacity
or choose a dedicated runner before traffic exceeds this low-volume setup.

GitHub schedules may be delayed or dropped under load, and public-repository schedules
can disable after 60 days without repository activity. Check Actions and the private inbox
regularly. This is not a delivery SLA or a suitable final runner for appointment reminders.
Render cold starts can add delay. Scheduled execution must be verified after deployment.

## Guarantees and limits

The inquiry and its two jobs commit in one transaction. Retries with the same inquiry
ID do not create more jobs. Email failures do not delete saved inquiries. Email disabled
at submission means no jobs are created, and historical inquiries are not backfilled.

Each job stores its exact plain-text payload and stable idempotency key. Owner emails
link to the protected inbox instead of including inquiry contents. Visitor receipts
do not echo user-supplied text or claim an appointment exists. From and owner recipient
are server configuration; the visitor address comes from validated submission data.

Workers claim due jobs with row locks and skip locked rows. A two-minute lease recovers
crashes. Lease tokens fence late workers from overwriting newer attempts. Temporary
network/429/408/5xx failures retry with exponential delays capped at one hour, at most
eight attempts. Definitive provider errors stop as failed. After 23 hours from the
first attempt, unresolved jobs stop as review, since Resend retains idempotency keys
for 24 hours. Exactly-once inbox delivery is not claimed.

Accepted means the provider accepted the API call, not delivered/read. Bounce, complaint
and delivery webhooks are not yet implemented. Leave provider suppression controls
enabled; investigate receipt abuse and volume before public launch. The form still has
per-email/global limits, but does not prove ownership of a visitor address.

## Recovery

- Pending: wait for the next worker run or trigger it manually once due.
- Processing after interruption: the next run can reclaim it after two minutes.
- Failed: inspect the safe error code and Resend logs; fix sender/key/domain issues.
- Review: inspect Resend delivery history using the job's stable idempotency key before
  any resend decision. There is deliberately no blind retry button for ambiguous old sends.
- Rotate API keys only within the same Resend account. Pausing or switching accounts
  does not preserve provider deduplication beyond its retention period.
- Pause by setting `EMAIL_ENABLED=false` in Render and disabling the workflow variable.
  Existing jobs remain stored. Re-enable only after checking old uncertain jobs.

The private inbox includes a linked GitHub workflow badge above the messages. It reflects
the latest workflow result, can be cached by GitHub, and does not prove email delivery.
If a run fails with a missing worker secret, create it as a repository Actions **secret**
(not a variable or an environment-only secret), then re-run the failed job.

The private inbox shows job status, attempt count and sanitized error code; it never
renders payloads or secrets. Runtime logs do not include visitor addresses/messages.
Review data retention for both inquiries and outbox payloads before public launch.

## References

- [Resend sending API](https://resend.com/docs/api-reference/emails/send-email)
- [Resend idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction)
- [GitHub scheduled workflow limits](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## Implementation verification

On 2026-10-22, lint, type checking, all 84 tests (including real isolated PostgreSQL)
and production build passed. A running production build against a task-only local
database accepted an inquiry over HTTP, committed two jobs, rejected an unauthenticated
worker request, processed both jobs using a mock provider, and did not resend on
repeated submission/worker calls. No real emails were sent during these tests.
Resend DNS, live API delivery, actual recipient inboxes and scheduled execution still
require the setup and post-deployment checks above.

Immediate-send enhancement (2026-10-23): all 90 tests and production build passed.
A production-server HTTP smoke test with isolated PostgreSQL and a deliberately slow
mock provider returned saved before delivery completed, then accepted both jobs
without a scheduled call. Repeated submission did not resend. Live deployment of
this enhancement still needs verification; the owner's real-delivery confirmation
above refers to the previously deployed scheduled-worker version.
