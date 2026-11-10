# Booking provider setup

This extends the reservation foundation. Keep public confirmation disabled until
credentials, consent, migrations, and a controlled real booking have been verified.
Mocked provider tests do not establish that a live account is configured correctly.

## Fail-closed launch switch

Booking confirmation requires every provider below, a saved availability schedule,
the upgraded Google consent, and this explicit Render variable:

```dotenv
BOOKING_ENABLED=true
```

Leave it unset or `false` through merge and deployment. Visitors can still browse
available times, but the site will not display booking buttons. Turn it on only for
the controlled launch check after Zoom credentials and Google event consent are in
place. Configuration readiness is not a claim of live provider success.

## Zoom

Create and activate a **Server-to-Server OAuth** app in the Zoom Marketplace for
the account that hosts your discovery calls. Configure these granular scopes:

- `meeting:write:meeting:admin` — create the scheduled meeting.
- `meeting:read:meeting:admin` — verify a known meeting during manual recovery.
- `meeting:delete:meeting:admin` — cancel a booking's scheduled Zoom meeting.

Set these private Render environment variables (never `NEXT_PUBLIC_`):

```dotenv
ZOOM_ACCOUNT_ID=<app account ID>
ZOOM_CLIENT_ID=<app client ID>
ZOOM_CLIENT_SECRET=<app client secret>
ZOOM_HOST_USER_ID=<host Zoom user ID or host email>
```

Enable Zoom’s “Embed passcode in invite link for one-click join” host setting;
the adapter requires an embedded passcode because confirmations send a join link,
not a separate password.

The app creates a separate scheduled 30-minute meeting, with a generated passcode,
waiting room on, join-before-host off, personal meeting ID off, and automatic
recording off. Only the participant `join_url` is saved; never copy a host
`start_url` into a booking or email. Account-enforced Zoom policies can override
meeting settings, so check them on the live host account before launch.

Booking availability is configured in `America/Chicago`. Zoom meetings, Google
Calendar event timezone metadata, and booking emails use Central Time; displayed
abbreviations follow daylight saving time automatically (CST in winter, CDT in
summer). The booking page may also display the visitor's selected local timezone.

The agenda includes an opaque booking identifier for recovery, without the
visitor's name, email, or inquiry. A timeout may mean Zoom created a meeting even
though the app did not receive its response. Do not retry creation blindly. Find
the meeting in Zoom and use its ID for the owner recovery flow. The adapter checks
its booking identifier, host, start, duration, type and participant URL before
adopting it. If it cannot be verified, leave the booking pending review. A retry of
the public form must never create another Zoom meeting for the same reservation.

The owner recovery page is `/admin/bookings`. A persisted Zoom meeting can resume
deterministic Calendar synchronization. If creation timed out before the Zoom ID was
saved, find the meeting by the opaque booking reference in its agenda and adopt its
numeric ID. Releasing an uncertain time requires checking and removing any external
Zoom meeting and Google event, then explicitly acknowledging that cleanup. A fenced
attempt token prevents stale application work from confirming after owner release.
Client cancellation uses the expiring link in the confirmation email and is available
until 24 hours before the call. The app marks cancellation pending, cancels the Zoom
meeting and matching Calendar event, then queues a cancellation notice. If either
provider cannot be verified, the client can retry the same link to finish the
cancellation. The owner recovery UI for a provider cancellation that remains pending
after retries is still to be built.

## Google Calendar event consent

Keep the existing Calendar configuration and add:

```dotenv
CALENDAR_EVENTS_ENABLED=true
```

In Google Auth Platform **Data Access**, add the scope
`https://www.googleapis.com/auth/calendar.events.owned`. It grants event read/write
access to calendars you own; the app targets only `primary`. Keep the existing
`calendar.freebusy` permission. Reconnect from `/admin/calendar` and grant both
permissions using the owner Google account. Enabling the flag alone does not
upgrade an already saved free/busy credential. The callback must persist the new
scope grant before booking readiness succeeds.

With this flag off, Calendar connection requests only its existing free/busy
scope. The event adapter refuses writes. Restoring access also requires an active
Workspace Calendar service; an OAuth success does not by itself prove service
availability.

Each booking uses a deterministic Google event ID. The adapter first reads that
ID, creates only if absent, and reads again after an ambiguous insert or conflict.
Existing events must match the private booking marker, time, and Zoom join URL;
they are never overwritten during recovery. They must remain confirmed and
non-transparent so they continue to block availability. Events are private and busy,
use a generic title, and do not include visitor names or project notes. The client is
added as an attendee and receives a Google Calendar invitation; the confirmation
email is delivered separately.

## Controlled launch check

After deployment, verify consent and provider readiness, then make one controlled
booking using your own email. Check that exactly one Zoom meeting and one Google
event exist with the selected time, the event blocks availability, and both email
recipients receive the participant link. Verify Zoom host settings, calendar time,
and behavior after a duplicate submission. Provider failures must remain pending
review rather than displaying a false confirmation. Remove test events/meetings
manually when finished if a test booking remains.

The booking form keeps an uncertain request ID and its exact payload in browser
session storage so a reload retries the same booking instead of creating another.
It clears that session copy after a verified confirmation or an explicit edit. This
includes the visitor's submitted contact details for that browser tab only.

Google Calendar and PostgreSQL cannot commit atomically. The application persists
each verified provider identity before final confirmation and uses deterministic
Calendar recovery, but an owner can still edit or delete an event outside the app
between checks. Treat recovery as reconciliation, not cross-provider atomicity.

## Official references

- [Zoom Server-to-Server OAuth setup](https://developers.zoom.us/docs/internal-apps/create/)
- [Zoom access tokens](https://developers.zoom.us/docs/internal-apps/s2s-oauth/)
- [Zoom Meetings API: create, get and delete](https://developers.zoom.us/docs/api/meetings/)
- [Google Calendar event insertion and ID format](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [Google Calendar event lookup](https://developers.google.com/workspace/calendar/api/v3/reference/events/get)
