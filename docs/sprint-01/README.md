# Sprint 1 — Scope and design

Status: **Layout direction and core preferences accepted; remaining booking policies and technical prerequisites are open.**
Owner: Enoch Griffith · GriffamDev · Full Stack Software Engineer

## Objective

Make the launch scope, user journeys, screen structure, and engineering boundaries
clear enough to begin Sprint 2 without inventing business policies during implementation.
This sprint produces specifications, not working booking, AI, or account features.

## Review packet

1. [Product brief and launch scope](product-brief.md)
2. [Responsive screen wireframes and state flows](ux-spec.md)
3. [Prioritized backlog with acceptance criteria](backlog.md)
4. [Architecture decisions and conceptual data model](technical-plan.md)

## Decisions already established

- Name: Enoch Griffith. Label: Full Stack Software Engineer. Brand: GriffamDev.
- Domain: griffamdev.dev. LinkedIn: https://www.linkedin.com/in/enochgriffith/
- Custom tooling is part of the portfolio: booking, publishing, dashboards, AI demo.
- Next.js, React, TypeScript, Tailwind CSS and PostgreSQL form the foundation.
- Dark mode uses the finance-app cyberpunk palette; light mode remains available.
- Custom booking connects to the GriffamDev Google Calendar.
- Booking confirmation emails and reminders are required.
- Playable chess with conversational AI must ship with the public website.
- Public client/student accounts and paid mentoring follow the initial public launch.

## Confirmed preferences

- Audience: a mix of small businesses, startups and engineering teams.
- Keep the current layout direction for now; it may evolve.
- Free 30-minute project discovery calls, 30-minute buffers and 24-hour minimum notice.
- Describe the call as discussing project needs and fit; paid consulting is not an established offering.
- Render Free for the Next.js app/backend and Neon Free for PostgreSQL during development.

Confirmed 2026-10-27: Monday–Friday 9 AM–4 PM, America/Chicago, with a 30-minute
buffer after each call. Keep availability configurable and public booking disabled
until Calendar integration and reservation handling are verified.

## Remaining proposed defaults — not yet business commitments

| Decision | Proposed starting point | Status |
| --- | --- | --- |
| Booking horizon | Next 30 days | Awaiting Enoch |
| Time zone and weekly hours | America/Chicago; Monday–Friday 9 AM–4 PM | Confirmed 2026-10-27 |
| Reminders | 24 hours and 1 hour before; skip times already passed | Awaiting Enoch |
| Cancellation/rescheduling | Self-service until 24 hours before; contact owner afterward | Awaiting Enoch |
| Chess | Guest play, three difficulty presets, optional coaching | Proposed launch scope |
| AI budget | Hard server-side request and cost ceilings | Amount and model pending evaluation |

No booking times or policies are published or enforced by this documentation update.

## Content inputs needed before launch

- Existing logo and resume when available; do not invent substitutes presented as final.
- Approved bio, chosen services, working location/time zone, and contact address.
- Two or three publishable projects with role, screenshots, links, and verified outcomes.
- Confirmation of which work may be shown publicly; no invented testimonials or client logos.
- At least one useful article or video if those sections are promoted at launch.
- Consultation policies and meeting-link preference.

## Completion checklist

- [x] Document agreed scope and explicitly separate post-launch work.
- [x] Draft desktop/mobile wireframes and key failure/empty states.
- [x] Write prioritized stories, dependencies, and testable acceptance criteria.
- [x] Document architecture boundaries and conceptual data relationships.
- [x] Record unknowns and business-policy proposals.
- [x] Enoch confirms audience and accepts the current layout direction.
- [x] Confirm call duration, buffer length, minimum notice and development hosting.
- [ ] Confirm actual availability, time zone, buffer placement and remaining booking policies.
- [ ] Resolve Sprint 2 technical prerequisites: auth library, database access tool, hosting/worker execution plan.

Do not mark Sprint 1 complete merely because the review packet exists. Provider
accounts, paid plans, migrations, and production deployment are outside this sprint.
