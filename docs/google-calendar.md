# Owner Google Calendar connection

This slice connects only the owner account's primary calendar and reads free/busy
intervals. It does not create events, read event titles or open public booking.
Google sign-in remains unchanged. Event-write consent will be added with reservations.

## Google and Render setup

1. In the Google Cloud project used by `GOOGLE_CLIENT_ID`, enable **Google Calendar API**.
2. Open Google Auth Platform → Clients → the existing Web application OAuth client.
   Add an authorized redirect URI using the exact origin in Render's `BETTER_AUTH_URL`:
   `<BETTER_AUTH_URL>/api/admin/calendar/callback`.
   For `https://www.griffamdev.dev`, use
   `https://www.griffamdev.dev/api/admin/calendar/callback`.
   If the configured origin is instead `https://griffamdev.dev`, omit `www`.
   Keep the existing `/api/auth/callback/google` sign-in URI.
3. Configure the consent screen's data access for
   `https://www.googleapis.com/auth/calendar.freebusy` (plus existing identity scopes).
   If the app is External / Testing, include the owner as a test user. Google may
   expire testing refresh tokens after seven days when non-identity scopes are used;
   plan the appropriate publishing/verification or Workspace Internal configuration.
4. Keep the existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL` and
   `BETTER_AUTH_URL`. Add `CALENDAR_ENABLED=true` and `CALENDAR_TOKEN_KEY` in Render.
   Generate the latter locally with `openssl rand -hex 32`; put its output directly
   into Render, never a commit, chat or screenshot. Use a separate key from auth.
5. After this PR is merged, CI passes, and Render deploys migration 0005, sign in
   as the owner and visit `/admin/calendar`. Choose **Connect Google Calendar**,
   use `enoch.griffith@griffamdev.dev`, and grant the requested busy-time permission.
6. Click **Test calendar access**. Success reports the number of busy intervals in
   the next seven days; it sends no invitations or emails. A missing API, revoked
   token, declined scope or provider failure shows an error, never a false empty result.

The Google flow must be tested by the owner after setup. Automated tests use mocked
Google responses and disposable databases; they do not prove real Google consent.
The form works with server-rendered POSTs, so Google navigation is not a fetch redirect.

## Security and operations

- Authenticated, verified owner required on every endpoint, including callback.
  Google identity is verified by the official `google-auth-library` using the client
  audience; the returned verified email must match the configured owner.
- Same-origin POST starts consent. Random state is bound to an HttpOnly, SameSite=Lax
  cookie and a one-use, ten-minute database record owned by the signed-in user.
  PKCE protects the authorization code exchange. Starting again supersedes old consent.
- AES-256-GCM encrypts refresh tokens and pending PKCE verifiers using a dedicated key.
  Access tokens are short-lived and held in process memory. No tokens are returned
  to the UI or included in application error messages.
- Disconnect removes the local credential and pending consent, including protection
  against in-flight callbacks restoring it. It does not revoke the shared Google app
  grant: doing that could also invalidate the existing Google sign-in integration.
  Full revocation is available in Google's third-party connections settings.
- Reconnect failures preserve an existing connection. The UI says connected when a
  credential exists; **Test calendar access** verifies its current provider health.
- Losing/changing `CALENDAR_TOKEN_KEY` makes stored tokens unreadable. Keep it in
  Render's secrets; after a deliberate rotation, reconnect the calendar. Local
  disconnect works even if the key is missing. Restore the key when rolling back.
- Google requests use bounded timeouts and no automatic request retries. Failure is
  sanitized and fails closed. The server adapter accepts a bounded date range for
  later reservation checks; the owner test uses a fixed seven-day range.
- Migration 0005 is additive. Rollback code can leave the unused table in place.
  Never drop the table as an automated deployment rollback.

## References

- [Google server-side OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Calendar free/busy API](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query)

## Validation for this slice

`npm run check` passed: lint, TypeScript, 157 tests across 32 files (including real
PostgreSQL consent/replay/concurrency tests), and the production build. The first
local test attempt lacked its disposable database; the full rerun passed after
creating it. Browser checks use a disposable local owner and fake credentials.

Migration 0005 also passed on the existing schema-only Neon branch
`dev-booking-availability`, which expires November 3. A fresh branch could not be
created: the old expiring branch cannot have children and the project is at its
root-branch limit. Reused the isolated branch instead, then restored the CLI context
to production without pulling or changing local credentials. The schema diff from
production contains only the new Calendar table and its primary key.

`npm audit` still reports 17 dependency advisories (16 moderate in the lint tooling,
one high through jsdom's undici). These are outside the new Google adapter; no
breaking dependency upgrades were applied in this feature PR.

## Troubleshooting the access test

The owner test distinguishes disabled API (`api_disabled`), rejected/expired grant
(`reconnect`), OAuth client credentials (`oauth_client`), missing permissions
(`permission`), unreadable saved credential (`credential`), unavailable calendar
(`calendar_unavailable`), unexpected response (`invalid_response`), and transient
Google failures (`temporary`). Unrecognized failures retain the generic message.
The response includes a fixed diagnostic code and an actionable message; raw Google
errors, headers, token values and request configuration are never exposed.

If the old generic message appears, it does not establish that Google Calendar API
is disabled. Confirm API enablement in the project that owns the configured OAuth
client. After deploying the diagnostics update, run the access test again and use
its specific instruction. Do not regenerate CALENDAR_TOKEN_KEY merely to test it:
changing that key makes the existing credential unreadable until reconnecting.

The test also displays a safe diagnostic such as
`freebusy/403/ACCESS_TOKEN_SCOPE_INSUFFICIENT` or `token-refresh/400/invalid_grant`.
The same diagnostic and fixed application code are logged in Render as
`Calendar access test failed`. Only recognized provider reason codes, bounded HTTP
statuses and fixed endpoint labels are included. Unknown reasons remain
`unrecognized`; no raw message, URL, headers, token or email is logged. This separates
an authorization-server rejection from a Calendar API rejection without assuming
that every 403 is a Workspace policy issue. These diagnostics identify evidence for
the next fix; they do not themselves resolve the reported production denial.
