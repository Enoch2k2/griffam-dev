# Sprint plan

Sprints are initially estimated at 1–2 weeks, subject to capacity and discovery.
This skeleton is an initial foundation, not completion of Sprint 1 or Sprint 2.

| Sprint | Focus | Exit criteria |
| --- | --- | --- |
| 1 | Scope and design | Approve responsive wireframes, booking policies, first-release backlog, and architecture decisions; include chess. |
| 2 | Foundation | Database migrations, protected admin access, authentication choice, CI and preview deployment. |
| 3 | Public website | Final content, projects, services, about, uploaded resume, social links, and functioning inquiry flow. |
| 4 | Publishing | Custom editor, drafts, previews, publishing, media and resume management. |
| 5 | Booking | Custom calendar, Google OAuth/free-busy/events, availability rules, safe reservations, cancellation/rescheduling, recovery tests. |
| 6 | Chess engine and UI | Complete legal games, difficulty, side selection, move history, restart/resign, responsive accessible controls. |
| 7 | AI chess | Position-aware chat, coaching, usage limits, credential protection, AI failure recovery. |
| 8 | Notifications and launch | Confirmation/change emails, reminders, retries, delivery tracking, integrated verification, domain/HTTPS and public launch. |
| 9 | Client/student portal | Verification/recovery, own-appointment management, profiles, history and authorization tests. |
| 10 | Paid mentoring | Offerings, payments, slot holds, verified payment events, resources and cancellation/refund policies. |

## Current sprint

Sprint 4 is underway: see the [publishing checklist](sprint-04/README.md).
Sprint 3 public pages and inquiry emails are merged; the owner confirmed instant email
delivery on 2026-10-23. Remaining content review and the resume carry forward.
See the [public website checklist](sprint-03/README.md).
Sprint 2 implementation is deployed; remaining operational checks are tracked in the
[foundation checklist](sprint-02/README.md).
Sprint 1 layout direction, audience and core booking preferences are accepted.
Actual availability and remaining booking policies stay open for the booking sprint.

## Launch acceptance

A visitor can book, receive confirmation, reschedule and cancel. Calendar and
reminders stay consistent. A visitor can complete a chess game and discuss its
position with AI. Public pages work on mobile and keyboard navigation. Published
content is discoverable; private records and drafts are protected. No fabricated
case studies or unavailable resume downloads. Remove scaffold notices and review
search indexing at launch. Evaluate accessibility, dependency audit, backups,
error monitoring, and provider costs before connecting production data.

## Deferred

Voice chess chat, saved games, advanced chess reviews, protected video courses,
and client project/file workspaces beyond appointment management.
