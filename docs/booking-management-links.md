# Client booking management links

Each confirmed booking receives an opaque client management link in its confirmation
email. The link includes a 32-byte cryptographically random URL-safe token. The
database stores only its SHA-256 digest in `booking_reservation.management_token_hash`;
the raw token is present only in the queued confirmation email needed to deliver it.
Token creation, digest storage, confirmation status, and email enqueueing happen in
one database transaction.

The link expires at the booked call's end time (`management_token_expires_at`).
Cancellation must also be rejected inside the 24 hours before the call, regardless
of token validity. A separate reminder is intended 24 hours before the call; the
reminder scheduler is implemented separately from token issuance.

Management handlers should validate the token's URL-safe format, hash it with
SHA-256, compare the digest in constant time, and reject expired or missing tokens
with a generic response. Never log the raw token or include it in analytics. The
token grants access to this booking only and must not expose other client records.

The confirmation email says that the link can manage or cancel the booking. The
public management page and cancellation/reschedule provider orchestration are
separate workflow work; do not enable booking until those actions are available.
