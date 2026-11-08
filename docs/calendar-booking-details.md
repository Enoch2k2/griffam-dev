# Booking event details

New Google Calendar events use `Discovery call with [client name] — GriffamDev`
as their title. The description contains the client name, email, selected time zone,
project notes (or an explicit empty-notes message), participant Zoom link, and
booking reference. Client text is escaped because Calendar descriptions support HTML.

Both initial confirmation and owner recovery use the saved reservation details.
Events remain private. The booked client is added as an attendee and Google sends
the calendar invitation when the event is first created. The existing booking
confirmation email is still sent separately.

This applies to newly created events after deployment. Existing events are verified
and reused without rewriting their title or description, preserving owner edits
and the existing retry behavior. Previously created events do not receive a
retroactive invitation. There is no automatic historical backfill.
