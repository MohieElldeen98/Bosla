# Bosla — CMS Overview

> Status: the foundation (Step 6.1) **and the live homepage migration (Step
> 6.2)** are both implemented — real Drizzle schema, repositories, services,
> and Server Actions exist under `src/cms/`, the six tables below are
> migrated and seeded in the real database, and
> `src/app/[locale]/page.tsx` reads the homepage, its navigation, its footer
> settings, and its SEO metadata from the CMS via
> `HomepageRepository`/`HomepageService` (see §13 "Migration path", now
> marked complete). **No Admin UI exists yet** — editing today's seeded
> content still requires a script or direct SQL, not a form — see
> [`architecture.md`](./architecture.md) §6 for why this is a custom,
> database-backed CMS rather than a third-party headless CMS.

## 1. Scoping decision: a fixed section registry, not a generic page builder

The homepage is "section-based" and CMS-manageable, but Bosla does **not** need a
fully generic drag-and-drop widget builder (arbitrary blocks, arbitrary layouts,
nested columns, etc.) — that's significant engineering investment for a product
with a handful of well-known section types. Instead:

- The codebase defines a fixed, known set of section **types** (`hero`,
  `featured_instructors`, `featured_courses`, `categories`, `why_bosla`,
  `learning_experience`, `testimonials`, `faq`, `statistics`, `cta` —
  `src/cms/types/section.ts`'s `CMS_SECTION_TYPES`) — each type has a
  matching content schema; `featured_instructors`, `categories`, and
  `statistics` are registered and ready but have no standalone homepage
  component yet (§13) — a hand-built component is still an engineering
  prerequisite before a section type can actually appear on a page.
- An Admin can, per section instance: edit its text content, reorder it relative
  to other sections, and toggle it visible/hidden. An Admin **cannot** invent a
  new section type or change a section's internal layout from the CMS.
- Adding a genuinely new section type (say, a "Partners" logo strip) is an
  engineering task — build the component, define its schema, register it — not a
  CMS configuration task.

This keeps 90% of the flexibility marketing actually needs (reorder, edit copy,
hide something seasonally) without building a page-builder product inside a
product.

## 2. Homepage sections

Each row of the `cms_sections` table (see
[`database-overview.md`](./database-overview.md) §5, real as of Step 6.1) belongs
to a `cms_pages` row (`slug: "home"` for the homepage) and has a `section_type`
matching one of the types below, plus a `content` JSON shape specific to that
type, validated against the Zod schema registered for it in
`src/cms/validators/section-content.schemas.ts`. All text fields are translatable
(`{"en": ..., "ar": ...}`).

**This registry is not identical to the section types the live homepage's own
rendering pipeline uses** (`src/types/homepage.ts`'s `SectionType`, a
legacy camelCase union kept for `SectionRenderer`'s `switch`) — see §13
"Migration path" for the mapping between the two.

| Section type | Editable content | Not editable from CMS |
|---|---|---|
| `hero` | Eyebrow, three headline lines, description, image, primary/secondary button, highlights list, statistics list, instructor slide order (by instructor ID) | The dashboard mockup illustration itself (code-driven, decorative); the instructor's own profile fields (§4) |
| `featured_instructors` | Eyebrow, title, subtitle, max items shown | Which instructors appear — controlled by an `is_featured` flag on the instructor record, not edited here (§4). Registered, no standalone homepage section yet — today's "featured instructors" live inside Hero's slide order above. |
| `featured_courses` | Eyebrow, title, subtitle, max items shown | Which courses appear — controlled by an `is_featured` flag set per-course on the **Courses** admin page, not edited here (avoids two places editing the same fact) |
| `categories` | Eyebrow, title, subtitle, and a reorderable list of category cards (icon, label, link, optional image) | Registered, no standalone homepage section yet. |
| `why_bosla` | Eyebrow, title, subtitle, and a reorderable list of pillars (icon, title, description) | — |
| `learning_experience` | Eyebrow, title, subtitle, and a reorderable list of capability bullets | The lesson-player mockup (chapters, timestamp) — code-driven, decorative, same precedent as Hero's illustration |
| `testimonials` | Eyebrow, title, subtitle | The testimonials shown — see §3; today seeded as fixed copy (matching the pre-migration mock) until real `reviews` exist |
| `faq` | Eyebrow, title, and the question/answer list (add/remove/reorder), answers support rich text | — |
| `statistics` | Eyebrow, title, and a reorderable list of stat items (icon, value, label) | Registered, no standalone homepage section yet — today's platform statistics live inside Hero's `statistics` list above. |
| `cta` | Title, subtitle, primary/secondary button, optional background image | — |

## 3. Testimonials: sourced from reviews, not a separate content type

Rather than giving Admins a second place to type in "fake-looking" marketing
testimonials that drift from reality, homepage testimonials are **real student
`reviews`, curated by an Admin**:

- Any `review` can be flagged `is_featured_testimonial = true` by an Admin from
  the Reviews moderation screen.
- The homepage `testimonials` section renders the current featured reviews
  (ordered by an Admin-set `featured_position`), pulling quote/name/rating live
  from `reviews` + `users`.
- This means testimonials are always attributable to a real (consenting)
  student and course, which matters for credibility in healthcare education
  specifically.
- **Fallback for launch content:** before real reviews exist, an Admin can create
  a small number of `reviews` directly (as an Admin action, attributed to a real
  early student who agreed to it) rather than inventing a parallel schema just to
  bootstrap the homepage. No separate "testimonials" table is needed.

## 4. Featured instructors ("Doctors")

> `instructor_profiles` (and its `is_featured`/`is_approved` flags) is still
> conceptual — no table exists yet (see
> [`database-overview.md`](./database-overview.md) §1). The `featured_instructors`
> CMS section type (§2) is ready to consume it the moment that table lands;
> until then its `content` is display configuration only (eyebrow/title/
> subtitle/max-items), with no real "which instructors" data behind it.

- `instructor_profiles.is_featured` (boolean) lets an Admin pin specific
  instructors to a "Meet the Instructors" homepage or landing-page section.
- Instructor approval (`is_approved`) is a separate, required gate — an
  instructor must be approved before they can publish courses at all; "featured"
  is a marketing curation step on top of already-approved instructors.
- The instructor's editable public profile (headline, bio, credentials, avatar)
  is authored by the instructor themselves in the Instructor Panel (see
  [`roles-and-permissions.md`](./roles-and-permissions.md)) and **moderated**
  (can be unpublished) by an Admin — Bosla's brand credibility depends on
  instructor bios being accurate and professional, so this is reviewed content,
  not free-form.

## 5. Courses (Admin's view)

Course *authoring* (modules, lessons, quizzes, pricing) belongs to the Instructor
Panel — see [`roles-and-permissions.md`](./roles-and-permissions.md). From the
CMS/Admin side, a Course is something to **moderate and curate**:

- Approve a course out of `in_review` into `published` (or send it back with
  feedback).
- Toggle `is_featured` (feeds the homepage `featured_courses` section).
- Unpublish/archive a course (policy violation, outdated content, instructor
  request).
- Edit SEO fields for a course's public page (see §7).

## 6. Articles

- Admin and approved Instructors can author `articles` (title, body, cover
  image, SEO fields) through a simple draft → published workflow.
- Articles are independent of courses — used for SEO and thought leadership
  (e.g. "How to structure a home exercise program"), not gated behind purchase.
- No commenting/discussion system on articles at launch (see
  future-features.md) — keeps articles a pure content type, not a moderation
  surface.

## 7. SEO

- Every content type that has its own public URL (Course, Article, Landing
  Page) gets an optional `seo_meta` record: title, description, canonical path,
  OG image.
- If a content item has no `seo_meta`, the page falls back to sensible
  generated defaults (e.g. course title + a fixed template), never to a blank
  `<title>`.
- Sitewide SEO defaults (default OG image, default description, robots
  directives) live in `cms_site_settings` under the `seoDefaults` key (real,
  Step 6.1 — see `src/cms/types/site-settings.ts`), intended to be editable
  by a Super Admin only — see [`roles-and-permissions.md`](./roles-and-permissions.md)
  (that role restriction isn't enforced per-key yet, only "any admin or
  super admin" via `requireCmsAccess`; see "Migration path" §13).
- This mirrors and extends the `generateMetadata` pattern already used in
  `src/app/[locale]/layout.tsx` today, just backed by editable data instead of
  hardcoded translation strings once dynamic pages exist.

## 8. Navigation

- Header nav links and the three footer link columns (Product, Company,
  Resources) are rows in `cms_navigation_items` (real, Step 6.1), editable
  (label + link + icon + order + enabled) by an Admin via
  `CmsNavigationService`/`navigation.actions.ts`.
- The language switcher and the Sign In/Get Started buttons are **not**
  CMS-editable — they're structural product chrome, not marketing content.
- Today's live header/footer (`src/components/layout/navbar.tsx`, `footer.tsx`)
  still render hardcoded links from `messages/*/navigation.json` and
  `footer.json` — not wired to this table yet, same "Migration path" gap
  as homepage sections (§13).

## 9. Footer (non-navigation content)

- Tagline, social links, and newsletter section copy are a small singleton
  editable block: `cms_site_settings` under the `footer` key (real, Step
  6.1 — `FooterSettings` in `src/cms/types/site-settings.ts`) — not
  "sections" in the reorderable sense, since the footer's layout is fixed.
- The newsletter form's behavior (what happens on submit) is a product/
  integration decision tracked in future-features.md, not a CMS concern.

## 10. Media Library

- Every image/video/document uploaded anywhere in the admin or instructor
  experience becomes a `cms_media_assets` row (real, Step 6.1) and is
  intended to be browsable in one central Media Library screen once that
  screen exists.
- Supports today (via `CmsMediaService`): create (given an already-uploaded
  URL — no uploader UI/file-upload action exists yet, matching Step 6.1's
  "no admin UI" scope), read, list, delete. Search/filter-by-type, alt-text
  editing UI, and "blocked if referenced" delete protection are not built.
- Storage itself is Supabase Storage; this library is the metadata/browsing
  layer on top of it (see [`architecture.md`](./architecture.md) §6).

## 11. Landing pages

- **Structurally real as of Step 6.1**: `cms_pages` has no special-casing for
  `slug: "home"` — any other slug (`CmsPageService.create({ slug: "sports-medicine-launch",
  ... })`) is already a fully working landing page with its own ordered,
  toggleable `cms_sections` and its own `cms_seo_meta`. What's missing is a
  route (`src/app/[locale]/[slug]/page.tsx` or similar) that resolves a
  landing page by slug and renders it — a future step, not a schema change.
- Intended use: specialty launch pages ("Now offering Sports Medicine"),
  campaign pages, partnership pages — without needing a code deploy per
  campaign.
- Admin-only creation; not exposed to Instructors (not yet enforced beyond
  "any admin/super admin" — see §13).

## 12. Related documents

- [`database-overview.md`](./database-overview.md) — table definitions behind
  every editable area above.
- [`roles-and-permissions.md`](./roles-and-permissions.md) — exactly which admin
  role can edit which of the above.
- [`authentication-architecture.md`](./authentication-architecture.md) — the
  `requireCmsAccess` authorization check every CMS mutation uses.

## 13. Migration path — from mock homepage to CMS-backed homepage (complete, Step 6.2)

The homepage is now fully CMS-backed. What changed, concretely:

1. **Registry extended.** `why_bosla` and `learning_experience` were added to
   `CMS_SECTION_TYPES` (and the `cms_section_type` Postgres enum, via a new
   migration) with their own content schemas, following the exact pattern
   `hero`/`faq`/etc. already used — the same "engineering task, not a CMS
   configuration task" process §1 describes. `hero`'s content grew a
   `headlineLine1`/`2`/`3` split (replacing a single `headline`) and a
   `slides` list of `{id, instructorId}` references, matching what the live
   Hero component actually needs.
2. **Components rewired.** `FeaturedCourses`, `WhyKnowledgeOs`,
   `LearningExperience`, `Testimonials`, `FaqSection`, and `CtaSection` now
   accept a `content` prop resolved from the CMS instead of calling
   `useTranslations` for their marketing copy — the same pattern `Hero`
   already used since Step 4.2. Interactive/accessibility microcopy (button
   aria-labels, filter labels, form validation messages) deliberately stayed
   in `messages/*.json` — see `architecture.md` §2's static-chrome-vs-content
   split.
3. **Seeded.** A one-time script populated `cms_pages` (`slug: "home"`),
   its seven `cms_sections` rows, `cms_navigation_items` (header + three
   footer locations), and `cms_site_settings`'s `footer` key with content
   copied verbatim from the old mock/`messages/home.json`, so the migration
   was visually a no-op.
4. **Swapped.** `src/repositories/homepage.repository.ts` now calls
   `CmsPageService.getResolvedBySlug("home", locale)` (via a
   `React.cache()`-wrapped `getHomeCmsPage`, shared with the homepage's
   `generateMetadata` to avoid querying twice per request) instead of
   reading `homepageSectionsMock` (deleted). `HomepageService` still does
   one piece of homepage-specific enrichment — resolving each Hero slide's
   `instructorId` via the still-mock-backed `InstructorService` — since that
   join is homepage business logic, not generic CMS locale-resolution.
   `SectionRenderer` itself was untouched beyond passing `content` through.
5. **Navigation, footer, and SEO wired.** `src/app/[locale]/page.tsx` fetches
   header + all three footer nav locations and the `footer` site setting
   alongside the homepage sections (one `Promise.all`, no N+1), and passes
   them down; `Navbar`/`Footer` became prop-driven for link/tagline/social
   data while keeping structural chrome (sign-in/get-started, brand name,
   newsletter form microcopy, copyright line) in `messages/`. The homepage
   also grew its own `generateMetadata`, reading the "home" page's
   `cms_seo_meta` with a fallback to the existing `Metadata` translations if
   absent — `layout.tsx`'s own sitewide `generateMetadata` (all other
   routes) is untouched.
6. **Revalidation.** The homepage has no `fetch()`/dynamic API calls (the
   CMS is read via plain Drizzle/postgres, invisible to Next's static
   analysis), so without `export const revalidate = 60` in `page.tsx` it
   would render once at build time and never re-read the database. ISR
   keeps it cached (fast, no per-request DB hit) while still surfacing an
   Admin's edit within a minute once an Admin UI exists to make one.

**Instructor data itself remains mock-backed** (`src/mock/instructors.mock.ts`
via `InstructorService`) — no `instructor_profiles` table exists yet (§4).
Hero's `slides` field is a CMS-authored *list of instructor IDs and order*,
not instructor content; this is the migration adapter §13 previously called
for, avoiding duplicating instructor data into CMS section content ahead of
that table existing.

Building the Admin UI (forms bound to `src/cms/actions/*`) is the natural
next step, since there's now real, seeded data for it to edit.
- [`architecture.md`](./architecture.md) — why this is a custom CMS and the
  bilingual content pattern every field above follows.
