# Bosla — Product Blueprint

> Status: planning document. Nothing in this file has been implemented. It describes
> where Bosla is going, not what exists in `src/` today. For the current, real state
> of the codebase see [`architecture.md`](./architecture.md).

## 1. What Bosla is

Bosla is a bilingual (Arabic/English) **educational marketplace** for healthcare
professionals, not a static course-catalog website. The distinction matters
architecturally: a marketplace has multiple content producers (instructors), a
commerce layer (orders, coupons, payouts), and an operations layer (admin review,
CMS-driven marketing pages) in addition to the learner-facing product.

**Initial focus:** Physiotherapy and healthcare education more broadly (the current
catalog also includes Nutrition). The catalog is intentionally narrow at launch —
depth in a few specialties builds credibility faster than breadth across many.

**Expansion path:** the domain model must not hard-code "Physiotherapy" or
"Nutrition" anywhere. Specialties are data (a `specialties` / category table), so
adding Sports Medicine, Nursing, Occupational Therapy, Speech Therapy, etc. later is
a content operation, not an engineering one.

**Audience:** students, interns, fresh graduates, practicing specialists, and other
healthcare professionals — see [`roles-and-permissions.md`](./roles-and-permissions.md)
for how that maps to product roles.

**Languages:** every learner-facing and instructor-facing surface ships in Arabic and
English from day one. This is a product requirement, not a localization afterthought
— see the "Bilingual content strategy" section in [`architecture.md`](./architecture.md).

## 2. Product pillars

1. **Evidence-based, clinical content.** Courses are built and vetted by practicing
   clinicians, not generic instructional designers.
2. **Marketplace, not walled garden.** Instructors can apply, get approved, and
   publish their own courses under admin review — Bosla is the platform, not the
   sole content author.
3. **Bilingual by design.** Arabic and English are equally first-class; RTL/LTR,
   fonts, and content translation are architectural concerns, not UI polish.
4. **Structured learning, not video dumps.** Every course follows the same
   predictable hierarchy (see §4) so learners always know where they are and what's
   next.
5. **Trust and credibility.** Reviews, instructor credentials, and (later) CME/CPD
   accreditation are core to why a clinician would trust a course enough to change
   their practice.

## 3. Major entities

This is the product-level catalog of "things" in Bosla. Field-level detail and
relationships live in [`database-overview.md`](./database-overview.md); this section
just defines what each thing *is* and why it exists.

| Entity | Definition |
|---|---|
| **User** | A single authenticated identity. Every Student, Instructor, and Admin is a User with a role (see roles doc). One login, multiple possible roles over time (a student can later become an instructor). |
| **Student** | A User who enrolls in and consumes courses. Has progress, orders, certificates, reviews. |
| **Instructor** | A User approved by an Admin to author and publish courses. Has a public profile (bio, credentials, specialties), a course catalog, and earnings. |
| **Course** | The top-level sellable unit. Belongs to one primary Specialty/Category, has one Instructor (or multiple co-instructors later), a price, a level, and a language (or bilingual variants). |
| **Module** | A named grouping of Lessons inside a Course (e.g. "Assessment", "Treatment Planning"). Purely organizational — no independent price or enrollment. |
| **Lesson** | The atomic unit of content: a video, a reading, or a quiz. Belongs to exactly one Module. Has a position/order and a completion state per student. |
| **Quiz** | A special Lesson type: a set of questions with a pass threshold. Produces a `QuizAttempt` per student. |
| **Resource** | A downloadable attachment on a Lesson (PDF protocol sheet, slide deck, home-exercise handout). |
| **Category / Specialty** | The clinical discipline a course belongs to (Physiotherapy, Nutrition, ...). Drives catalog filtering and future expansion. |
| **Certificate** | Proof of course completion, issued to a Student after finishing all required Lessons/Quizzes. Planned, not yet live (current marketing copy says "launching soon"). |
| **Order** | A commercial transaction: one or more Courses purchased by a Student, at a point-in-time price, optionally discounted by a Coupon. |
| **Coupon** | A discount code an Admin or Instructor can create, scoped to specific courses or sitewide. |
| **Review** | A Student's rating + written feedback on a Course they've enrolled in. |
| **Article** | Long-form editorial content (blog-style) used for SEO and thought leadership — not part of a paid course. |
| **Homepage Section** | A CMS-managed, orderable block on the homepage (Hero, Featured Courses, Why Bosla, Testimonials, FAQ, CTA, ...). See [`cms-overview.md`](./cms-overview.md). |
| **Media Library Asset** | A single uploaded file (image, video, document) reusable across courses, articles, and CMS sections. |
| **Notification** | A system or transactional message to a User (order confirmation, course update, new review, instructor approval). |
| **Setting** | A sitewide or feature-level configuration value editable by a Super Admin (site name, default currency, payment provider toggles, feature flags). |

## 4. Course structure hierarchy

```
Course
 └─ Module            (organizational grouping, ordered)
     └─ Lesson         (video / reading / quiz, ordered)
         ├─ Quiz        (optional, one per lesson at most)
         └─ Resource[]  (0..n downloadable attachments)
```

Rules of thumb:

- A Course always has at least one Module (even a short course gets a single
  default Module) — this keeps the data model and the UI consistent regardless of
  course length.
- Lesson ordering is per-Module; Module ordering is per-Course. Both are simple
  integer positions, editable by drag-and-drop in the future Instructor Panel.
- A Quiz is modeled as a Lesson *type*, not a separate parallel tree — this avoids
  two competing "what's next" orderings inside a course.
- Certificates are issued at the Course level once every required Lesson/Quiz is
  completed, not per-Module.

## 5. Monetization model (product-level)

- **One-time purchase per course** is the default model at launch (matches the
  existing marketing copy: "lifetime access... no recurring subscription").
- **Coupons** support percentage or fixed-amount discounts, scoped to one course,
  a specialty, or sitewide.
- **Instructor revenue share**: instructors are paid a percentage of net course
  revenue; payout mechanics are deliberately deferred (see
  [`future-features.md`](./future-features.md)) since they require legal/finance
  decisions beyond engineering scope.
- **Currency**: priced in USD initially with EGP as the primary regional currency
  once Paymob/Fawry are integrated (see the payment architecture section in
  [`architecture.md`](./architecture.md)). Multi-currency display is a later
  concern, not a launch requirement.
- **Bundles/subscriptions** (all-access plans) are explicitly out of scope for the
  initial commerce phase — see roadmap Phase 3 — to keep the first payment
  integration simple and shippable.

## 6. What Bosla is *not* (yet)

Being explicit about non-goals keeps the architecture honest and prevents scope
creep into the current implementation phase:

- Not a live/synchronous cohort platform (no scheduled classes, no video
  conferencing) — see future-features.md.
- Not a general-purpose CE/CME accreditation body — accreditation tracking is a
  future integration, not a feature Bosla invents itself.
- Not a social network — reviews and Q&A exist, but there is no course-independent
  social feed, follower graph, or public messaging in the current plan.
- Not multi-tenant / white-label — Bosla is a single branded marketplace, not a
  platform other companies re-skin.

## 7. Related documents

- [`architecture.md`](./architecture.md) — technical architecture, current stack,
  bilingual content strategy, payment architecture.
- [`database-overview.md`](./database-overview.md) — every entity's fields and
  relationships.
- [`cms-overview.md`](./cms-overview.md) — everything an Admin can edit.
- [`roles-and-permissions.md`](./roles-and-permissions.md) — who can do what, and
  every page each role sees.
- [`roadmap.md`](./roadmap.md) — phased delivery plan.
- [`future-features.md`](./future-features.md) — deliberately deferred ideas.
