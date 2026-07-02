# Bosla — Future Features

> Status: planning document. Everything here is **deliberately out of scope** for
> the phases in [`roadmap.md`](./roadmap.md). Each item includes why it's
> deferred, not just what it is — the reasoning is the part worth keeping, since
> "not now" decisions get revisited constantly and the rationale is what stops
> them from being re-litigated from scratch each time.

## Credentialing & compliance

- **CME/CPD continuing-education credit tracking.** Integrate with regional
  accreditation bodies (physiotherapy/nutrition syndicates) so completing a
  course counts toward a professional's license renewal requirements — the
  single most differentiating feature Bosla could add for this specific
  audience. **Deferred:** requires external accreditation partnerships and
  legal review per country; only worth pursuing once the catalog and
  instructor credibility are established enough to make those conversations
  possible.
- **Formal accessibility audit/certification (WCAG).** **Deferred as a formal
  audit pass** (not as a practice — accessibility hygiene should be part of
  every phase) until the authenticated surfaces (dashboard, instructor panel,
  admin) are stable enough that an audit isn't immediately stale.

## Learning experience

- **Live, scheduled cohort courses / webinars.** Real-time sessions with
  video conferencing and calendars. **Deferred:** large operational lift
  (scheduling, time zones, live support); the on-demand model is the core
  product and should be proven first.
- **AI-assisted study tools** — auto-generated quiz questions from lesson
  content, an AI tutor for clinical Q&A. **Deferred:** clinical-accuracy and
  liability review needed before any AI-generated content touches healthcare
  education; not a "ship fast and see" category.
- **Practical/clinical skills video-submission grading** — a student uploads a
  video of a technique for instructor feedback. **Deferred:** high per-student
  instructor time cost; valuable but needs a pricing/staffing model of its own
  before it's offered.
- **SCORM/xAPI export for institutional LMS integration** — letting
  universities license Bosla content into their own LMS. **Deferred:** a
  distinct B2B distribution channel, only worth building once the direct
  B2C product is proven.

## Community & engagement

- **Discussion forums** (per-course Q&A threads, cross-course community).
  **Deferred:** a forum with few active participants feels worse than no
  forum; wait until enough concurrent students exist per course.
- **In-app messaging between student and instructor.** **Deferred** in favor
  of course-scoped Reviews first — a full messaging system is a meaningfully
  different (and heavier) product surface than a review/rating.
- **Gamification** (badges, streaks, leaderboards). **Deferred, and to be
  applied carefully even later** — leaderboard-style mechanics can read as
  undermining a clinical-education platform's credibility if done wrong; if
  pursued, should reinforce completion/mastery, not competition between
  clinicians.

## Commerce & growth

- **Enterprise/Team plans** — a hospital or clinic buys seats for its staff,
  with a manager dashboard showing team-wide progress. **Deferred:** a second
  buyer type (organization, not individual) with its own seat-management and
  billing model; build once the individual-purchase loop is proven (Phase 3).
- **Affiliate/referral program.** **Deferred** until organic growth channels
  and their economics are understood — paying for referrals before knowing
  organic CAC is premature optimization.
- **Multi-currency dynamic pricing.** **Deferred** per the pricing model in
  [`product-blueprint.md`](./product-blueprint.md) §5 — launches USD/EGP fixed;
  revisit once expansion beyond Egypt/MENA is a real, funded initiative.
- **Bundles / all-access subscription plans.** **Deferred:** keeps the first
  payment integration (Phase 3) simple; reconsider once the catalog is large
  enough that a bundle is genuinely more attractive than à la carte.

## Instructor tooling

- **Automated instructor payouts** (Stripe Connect or local payout rails).
  **Deferred:** manual payouts are entirely workable at low instructor count;
  automation earns back its integration cost once payout volume/frequency
  makes manual processing a real burden.
- **Advanced instructor/admin analytics** (cohort retention, drop-off funnels
  per lesson). **Deferred:** meaningful insight requires data volume Bosla
  won't have until Phases 2–4 have been live for a while — building dashboards
  for data that doesn't exist yet is wasted effort.

## Platform & scale

- **Native mobile apps (iOS/Android) with offline downloads.** **Deferred**
  until web usage data shows real demand; a PWA-level "add to home screen" +
  basic offline caching is a much cheaper interim step worth revisiting first.
- **Partnerships with professional syndicates/associations** for
  co-branded or endorsed content. **Deferred:** long sales-cycle, best pursued
  once Bosla has case studies and completion data to bring to that
  conversation, not before.

## How to use this document

When a roadmap phase is being planned and one of these ideas comes up: the
default answer is "not yet, and here's why" (above). Promote an item out of
this file and into [`roadmap.md`](./roadmap.md) only when the reason it was
deferred has actually been resolved — e.g. don't build instructor payout
automation just because it's easy to build; build it when manual payouts are
demonstrably the operational bottleneck.
