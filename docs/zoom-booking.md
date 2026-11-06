# Zoom discovery calls

Enoch selected a separate Zoom meeting for each confirmed booking on 2026-11-04.
This reservation-foundation slice does not create meetings or enable public booking.
The provider workflow, recovery, review form and confirmation emails are next.

## Prepare the Zoom app

1. Sign in to the [Zoom App Marketplace](https://marketplace.zoom.us/) with the
   account that will host calls. You need account-owner/admin or equivalent app
   creation permissions.
2. Open Developers / Created Apps, choose Build an app, and select
   **Server-to-Server OAuth**. Name it `GriffamDev Booking`.
3. Complete the required app and developer contact information.
4. For meeting creation, add **Create a meeting for a user**:
   `meeting:write:meeting:admin`. Additional read/delete scopes will be selected
   when the recovery and cancellation workflows are implemented; don't grant
   unrelated recording or account-management scopes.
5. Activate the app. Keep its Account ID, Client ID and Client Secret private.
   No callback URL is required for this server-to-server flow.

Planned server-only Render variables for the provider slice (not consumed yet):

```dotenv
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_HOST_USER_ID=
```

`ZOOM_HOST_USER_ID` will identify your host user (Zoom user ID or the email attached
to that Zoom account). Never use NEXT_PUBLIC_ for these settings or paste secrets
into chat. The Zoom account does not have to use the Google Calendar email, but
its credentials and host must belong to the intended Zoom account.

## Before enabling confirmation

- Wire the protected reservation service to a validated, origin-checked public API
  with bounded bodies, bot/abuse protection, and a details/review UI.
- Create one scheduled meeting with waiting room enabled and personal meeting ID
  disabled; share only the participant join URL, never the host start URL.
- Persist provider state and recover uncertain outcomes. Do not blindly retry
  creation after a timeout: Zoom may already have created the meeting.
- Add Google event-write consent separately; current free/busy permission cannot
  create the corresponding calendar event. Recheck external conflicts before writes.
- Queue confirmation emails only after meeting and calendar creation are confirmed.
- Test with the real Zoom account, including expired credentials and provider failures.

## References

- [Create a Server-to-Server OAuth app](https://developers.zoom.us/docs/internal-apps/create/)
- [Zoom Meetings API — Create a meeting](https://developers.zoom.us/docs/api/meetings/)
