# Booking event details

New Google Calendar events use `Discovery call with [client name] — GriffamDev`
as their title. The description contains the client name, email, selected time zone,
project notes (or an explicit empty-notes message), participant Zoom link, and
booking reference. Client text is escaped because Calendar descriptions support HTML.

Both initial confirmation and owner recovery use the saved reservation details.
Events remain private and do not add attendees or send Google invitation emails;
the existing booking email delivery handles confirmations.

This applies to newly created events after deployment. Existing events are verified
and reused without rewriting their title or description, preserving owner edits
and the existing retry behavior. There is no automatic historical backfill.
