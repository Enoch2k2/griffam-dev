# Sprint 1 — Scope and design

Status: **Review-ready draft; awaiting Enoch’s business decisions and design review.**
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

## Proposed defaults — not yet business commitments

| Decision | Proposed starting point | Status |
| --- | --- | --- |
| Primary audience | Small businesses seeking custom software | Awaiting Enoch |
| Free consultation | 30 minutes | Awaiting Enoch |
| Buffer | 15 minutes after an appointment | Awaiting Enoch |
| Minimum notice | 24 hours | Awaiting Enoch |
| Booking horizon | Next 30 days | Awaiting Enoch |
| Time zone and weekly hours | Owner supplies IANA time zone and actual availability | Awaiting Enoch |
| Reminders | 24 hours and 1 hour before; skip times already passed | Awaiting Enoch |
| Cancellation/rescheduling | Self-service until 24 hours before; contact owner afterward | Awaiting Enoch |
| Chess | Guest play, three difficulty presets, optional coaching | Proposed launch scope |
| AI budget | Hard server-side request and cost ceilings | Amount and model pending evaluation |

No proposed times or policies are published or enforced by this sprint.

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
- [ ] Enoch confirms audience and consultation availability/policies.
- [ ] Enoch reviews the proposed wireframes and scope.
- [ ] Resolve Sprint 2 technical prerequisites: auth library, database access tool, hosting/worker execution plan.

Do not mark Sprint 1 complete merely because the review packet exists. Provider
accounts, paid plans, migrations, and production deployment are outside this sprint.
