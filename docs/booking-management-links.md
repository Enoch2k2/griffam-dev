# Client booking management links

Each confirmed booking receives an opaque client management link in its confirmation
email. The link includes a 32-byte cryptographically random URL-safe token. The
database stores only its SHA-256 digest in `booking_reservation.management_token_hash`;
the raw token is present in the queued confirmation and reminder email payloads
needed to deliver the links, then redacted from each payload after Resend accepts it.
Token creation, digest storage, confirmation status, and email enqueueing happen in
one database transaction.

The link expires at the booked call's end time (`management_token_expires_at`).
Cancellation is rejected inside the 24 hours before the call, regardless of token
validity. The management page can show the appointment and cancel it. Cancellation
marks the row pending before it cancels the matching Zoom meeting and private Google
event; retries safely finish a partial provider cancellation. The client receives
a cancellation email, while unsent confirmation and reminder jobs are suppressed.

The management handler validates the token's URL-safe format and looks up only its
SHA-256 digest. It rejects expired or missing tokens with a generic response. The
link keeps the token in a URL fragment, so browsers do not send it in the page
request or referrers. The page is excluded from indexing, disables referrers, removes
the token from browser history, and sends it to the API only in a same-origin POST
body. Never log the raw token or include it in analytics. The
token grants access to this booking only and must not expose other client records.

The outbox schedules one client reminder for 24 hours before the call. The existing
GitHub Actions worker polls every 15 minutes, so delivery can be up to one polling
interval late. It rechecks booking status before sending and suppresses reminders
for canceled or otherwise unconfirmed bookings. Rescheduling and recovery of a
partially canceled booking remain follow-up work. Public bookings should stay off
until the new database migration and provider cancellation behavior are deployed
and verified with a controlled booking.
