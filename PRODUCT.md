# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Healthcare professionals in a bilingual (Arabic/English) market: students,
interns, fresh graduates, and practicing specialists. Initial catalog focus is
Physiotherapy and healthcare education more broadly, with Nutrition also
represented — the domain model does not hard-code these, since more
specialties (Sports Medicine, Nursing, Occupational Therapy, Speech Therapy,
...) are meant to be added as data, not engineering work, later.

## Product Purpose

Bosla ("compass" in Arabic) is an educational **marketplace** for healthcare
professionals — not a static course-catalog site. It exists to deliver
evidence-based clinical education from practicing clinicians, structured so a
learner always knows where they are and what's next (Course → Module → Lesson,
with Quiz as a Lesson type and optional downloadable Resources). Success means
clinicians trust the platform enough to let a course change their practice.

## Positioning

What a neighboring product could not truthfully copy:

1. **Evidence-based, clinician-vetted content** — courses are built and vetted
   by practicing clinicians, not generic instructional designers.
2. **Marketplace, not walled garden** — instructors apply, get approved, and
   publish under admin review; Bosla is the platform, not the sole author.
3. **Bilingual by design, not as an afterthought** — Arabic and English are
   equally first-class from day one (RTL/LTR, fonts, translation are
   architectural, not cosmetic).
4. **Structured learning, not video dumps** — every course follows the same
   predictable hierarchy.

## Operating Context

- **Pre-launch preparation.** The current work is finishing/polishing the
  product *before* any marketing push or public announcement — there is no
  live marketing campaign or announced launch yet.
- Roles: Guest, Student (default on sign-up), Instructor (a Student approved
  by an Admin), Admin, and Super Admin — one `profiles.role` per user, a
  single identity can hold different roles over time (a student can later
  become an instructor).
- A learner's personal hub is `/me` (Overview, Courses, Certificates,
  Profile, Settings) — the same hub for every authenticated role, separate
  from the Instructor Panel (`/instructor`) and Admin Panel (`/admin`).
- Monetization at launch: one-time purchase per course (no subscriptions/
  bundles yet), percentage/fixed coupons, instructor revenue share. Priced in
  USD initially, with EGP via Paymob/Fawry as the primary regional currency.

## Capabilities and Constraints

- Course structure is fixed: Course → Module (ordered) → Lesson (ordered:
  video / reading / quiz) → optional Quiz (one per Lesson, not a separate
  tree) and Resource[] (downloadable attachments). Every course has at least
  one Module, even a short one.
- Certificates are issued at the Course level once every required
  Lesson/Quiz is complete — not per-Module.
- Explicit non-goals (do not design toward these): no live/synchronous
  cohort classes or video conferencing; not a general CE/CME accreditation
  body itself (accreditation is a future integration, not a built-in
  feature); not a social network beyond course-scoped reviews (no feed,
  follower graph, or public messaging); not multi-tenant/white-label.
- Deliberately deferred (do not assume these exist): CME/CPD credit
  tracking, AI-assisted study tools, video-submission grading, SCORM/xAPI
  export, discussion forums, in-app messaging, gamification, enterprise/team
  plans.

## Brand Commitments

Confirmed name: **Bosla**. No other binding brand commitment (tagline, tone
rule, or fixed logo/asset) is established yet — voice and visual identity
remain open.

## Evidence on Hand

- **Real, published content:** blog/articles (long-form editorial content
  for SEO and thought leadership).
- **Not yet real:** the course catalog is still static/mock data — no real
  instructors or courses have been onboarded or published yet. Future work
  must not present specific course titles, instructor names/credentials, or
  enrollment/review numbers as real; treat existing catalog copy as
  placeholder until stated otherwise.
- No customer testimonials, case studies, or press exist yet — do not
  fabricate any.

## Product Principles

1. Depth in a few specialties builds credibility faster than breadth across
   many — resist expanding the catalog's apparent scope before content does.
2. Every course looks and behaves the same structurally, regardless of
   length or specialty — predictability over per-course customization.
3. Arabic and English are peers, not a primary language with a translated
   afterthought — this applies to structure and content parity, not just
   string translation.
4. Trust is the product's real currency for this audience; instructor
   credentials, vetting, and (later) accreditation matter more than growth
   mechanics like gamification.
5. The platform is mid-preparation, not yet marketed — avoid design or copy
   that implies an established, populated marketplace (e.g., real review
   counts, learner counts, or instructor rosters) until that's true.

## Accessibility & Inclusion

No formal accessibility standard (e.g. WCAG level) is required yet; a formal
audit is explicitly deferred until authenticated surfaces (dashboard,
instructor panel, admin) stabilize. Accessibility hygiene should still be
practiced by default, just not audited/certified yet.
