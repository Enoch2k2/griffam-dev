# Booking calendar UI execution plan

Prepared November 6, 2026. Planning only; execute with Sol at medium reasoning after
the user switches models. No application code was changed for this plan.

## Goal and scope

Replace the long list of all available call times on `/book` with a month calendar.
Highlight days that have availability; selecting a day reveals only that day's
times. Preserve the current details, review, confirmation and uncertain-retry flows.

PR #22 is merged and deployed. Production availability now has the owner's saved
Monday–Friday, 9 AM–4 PM America/Chicago schedule. Live availability returned HTTP
200 and bookingEnabled=true, and selecting a slot opened the details form. This
was not a completed real-provider booking test.

This is a frontend slice. Keep the availability API, Google/Zoom integrations,
reservation logic, database and booking rules unchanged. No new calendar dependency
is needed; build a small feature component using React and existing date tooling.

## Starting point and delivery

- Planning branch: `codex/booking-calendar-ui`, created from current `origin/main`
  at `f14e1d3`. This plan is intentionally left uncommitted for the executing model.
- Before implementation, inspect git status, fetch origin, and confirm the branch
  still starts from current main. If main advanced, bring this branch up to date
  without discarding local edits. Continue this branch for this work item.
- Preserve the unrelated user edit in `docs/zoom-booking.md`; never stage it.
- Read `AGENTS.md`, `docs/development.md`, and relevant installed Next.js guides
  in `node_modules/next/dist/docs/` before writing code.
- Use focused conventional commits, run `npm run check`, push, open a PR, attach
  it to the task, and check GitHub Actions. Do not merge or deploy manually.
- Do not execute the historical unfinished-work instructions in
  `docs/execution-handoff.md`: its section 5 was completed by PR #22.

## Proposed experience

1. Keep the page introduction and a compact display-time-zone control with
   "Use my time zone". Preserve the current explicit "View available times"
   fetch, avoiding a provider request on every page visit.
2. Once loaded, show a two-panel card: calendar on the left, selected-day times
   on the right. Stack calendar above times on narrow screens.
3. Calendar header: month/year, previous month, next month. Use a familiar
   Sunday-first, seven-column layout with weekday headings. Render leading and
   trailing blanks rather than duplicated dates from adjacent months.
4. Days with returned slots have a clear accent treatment and a small availability
   marker. Selected day gets a stronger treatment; today gets a distinct outline.
   Explain the availability marker in a small legend. Do not rely on color alone.
   Dates without slots are disabled, including weekends, blocked days and dates
   outside the returned window. Derive eligibility from slots, not weekday rules.
5. On first successful load, select the earliest available date and display its
   month. The right panel shows the full selected date, selected time zone and a
   compact grid of that day's times. Selecting another date replaces this list.
6. Selecting a time opens the existing BookingForm. Its "Choose another time"
   action refreshes availability and returns to the same date/month when still
   available; otherwise select the earliest remaining available date.
7. Retain "Refresh times" as a secondary action. A refresh must disable/remove old
   actionable times while pending. A failed refresh must not leave stale times
   clickable. Keep clear retry and contact alternatives.

Suggested layout:

```text
Display time zone [America/Chicago v]  [Use my time zone]

+-----------------------------+--------------------------------+
| <     November 2026      >   | Monday, November 9             |
| Sun Mon Tue Wed Thu Fri Sat | Times in America/Chicago       |
| ... highlighted days ...   | [9:00 AM] [9:30 AM] [10:00 AM]  |
| Available •   Selected ■   | ... only this day's times ...  |
+-----------------------------+--------------------------------+
[Refresh times]                 Free · 30 minutes · Zoom
```

## State and date rules

- Keep selectedSlot separate from selectedDate (`YYYY-MM-DD`) and visibleMonth
  (`YYYY-MM`). Never use a localized display label as a date key.
- Group each slot by its start instant in the selected display time zone. Use
  existing Temporal or Intl.formatToParts for date keys; never host-machine local
  Date parsing or UTC slicing for visitor-local dates.
- Sort slots chronologically and date keys in calendar order.
- On time-zone change, regroup existing slots without refetching. Keep selectedDate
  if it still has slots; otherwise select the earliest available date and its month.
  All day labels and time labels must reflect the new zone, including midnight and
  DST transitions. Distinguish repeated local times with their zone/offset labels.
- Navigation spans the months containing returned available dates, inclusive. Allow
  intermediate empty months if needed, and disable controls at the bounds. Month
  navigation alone does not select a date; when the selected date is in another
  month, show "Choose an available day" in the time panel until a date is selected.
- With zero slots, show the existing no-times/contact message instead of an empty
  navigable calendar. Keep retry controls for errors or malformed API responses.
- Preserve browse-only mode when bookingEnabled is false or missing: dates may be
  selected, but their times are informational and cannot open the booking form.
- Preserve sessionStorage recovery before any calendar state initializes. A saved
  uncertain booking must still reopen the original attempt with its UUID and
  payload; do not silently replace it with a newly selected time.
- Keep API payload validation and no-store fetch behavior intact. Changing a day
  or month must not issue another availability request.

## Component structure and styling

- `src/features/booking/call-times.tsx`: retain fetching, validation, time-zone
  selection, bookingEnabled, session recovery, and transition into BookingForm.
- Add `booking-calendar.tsx` for calendar navigation/date selection and its focused
  styles in `booking-calendar.module.css`. Keep the single-day time list here or
  in CallTimes according to which produces the simplest clear props.
- Extract a small pure `calendar-view.ts` only for real shared date-grouping/month
  calculations; keep tests alongside it. Avoid generic utilities or abstractions.
- Reuse theme variables and existing button patterns. Support light and cyberpunk
  dark modes; selected/available/today/focus states must remain distinguishable.
- Ensure seven calendar columns fit at 320px viewport width with no horizontal
  overflow. Time buttons should have comfortable touch targets and wrap naturally.
- Remove old `.call-days`/`.call-day` rules only after checking other usages.
- Keep this slice out of owner availability editing and owner recovery UI.

## Accessibility

- Use semantic table markup with weekday column headers and native date buttons;
  do not add ARIA grid roles unless implementing the complete grid interaction.
- Give date buttons full accessible date names, availability count and selected
  state (aria-pressed). Use aria-current="date" for today where applicable.
- Native Tab/Shift+Tab and Enter/Space must reach/activate available days and times.
  Disabled days must not be actionable. Name month navigation buttons clearly.
- Keep focus on the selected day after activation; place the times region after
  the calendar in DOM order. Announce selected date/count through a short polite
  status message, not the entire calendar. Avoid focus loss on month navigation.
- Retain existing BookingForm heading focus behavior and accessible full-date/time
  labels for slot buttons. Make keyboard focus visibly obvious in both themes.

## Verification and acceptance

Update `call-times.test.tsx` and add focused calendar/date helper tests as needed.
Use React Testing Library and user-event, checking observable interactions:

1. Initial fetch remains explicit. Earliest available day is selected after load.
2. Only selected-day times are rendered. Choosing another available day replaces
   them without another fetch; unavailable dates cannot reveal bookable times.
3. Correct month layout/navigation across month/year boundaries, leap February,
   and disabled navigation at bounds.
4. Time-zone conversion shifts a slot to the correct date/month; DST repeated local
   times remain distinguishable; selection fallback follows the rules above.
5. Loading, zero slots, malformed payload, failed refresh and successful retry;
   stale times cannot be selected after refresh failure.
6. Browse-only mode cannot open BookingForm. Enabled mode still reaches details,
   review and confirmation using the original slot instant and selected time zone.
7. "Choose another time" refreshes and preserves/falls back from the prior day.
8. Existing pending-attempt session recovery, conflict refresh and retry identity
   remain covered by existing booking tests; update only where necessary.
9. Keyboard selection, selected/today labels, focus and status announcements.

Run `npm run check`. Do not point integration tests at production; record any
skipped integration checks. This slice needs no database writes or provider setup.
Use mocked fixture slots for deterministic timezone/date edge cases.

Visually inspect a running local app at desktop and mobile widths in both themes:
calendar proportions, seven-column fit, long zone labels, selected-day panel,
empty/error states and returning from BookingForm. Local Google credentials may
be absent; use a development-only test fixture/mock without committing fake public
availability or weakening production checks. Do not create real Zoom meetings,
Calendar events or send emails merely to verify this visual change.

Done means: the full 30-day slot list is gone, available days are obvious, a visitor
sees only one day's times, the existing booking flow still works, checks pass, and
the PR is ready for the user's review with actual verification results reported.

## Prompt for Sol (medium)

Read docs/booking-calendar-ui-plan.md and implement this frontend slice on
codex/booking-calendar-ui. Preserve my existing edit to docs/zoom-booking.md.
Follow the calendar interaction and time-zone rules, retain booking recovery,
test and visually verify light/dark mobile/desktop layouts, then commit, push and
open a PR. Check CI and attach the PR. Do not merge or create real bookings.
