# Bosla — CMS Overview

> Status: the foundation (Step 6.1), the live homepage migration (Step 6.2),
> the Admin Panel shell (Step 6.3), and the Homepage CMS editor (Step 6.4)
> are all implemented — real Drizzle schema, repositories, services, and
> Server Actions exist under `src/cms/`, the six tables below are migrated
> and seeded in the real database, `src/app/[locale]/page.tsx` reads the
> homepage, its navigation, its footer settings, and its SEO metadata from
> the CMS (see §12 "Migration path"), and `/admin/homepage` (see §13) edits
> the homepage's sections and SEO through that same
> Repository → Service → Server Action stack. Every *other* CMS surface
> (Navigation, Footer, Media Library, Users, Courses, Instructors,
> Categories, Site Settings) is still a placeholder in the Admin Panel — see
> [`authentication-architecture.md`](./authentication-architecture.md) §15.
> See [`architecture.md`](./architecture.md) §6 for why this is a custom,
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
  component yet (§12) — a hand-built component is still an engineering
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
legacy camelCase union kept for `SectionRenderer`'s `switch`) — see §12
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
  super admin" via `requireCmsAccess`; see "Migration path" §12).
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
  as homepage sections (§12).

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
  "any admin/super admin" — see §12).

## 12. Migration path — from mock homepage to CMS-backed homepage (complete, Step 6.2)

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
not instructor content; this is the migration adapter §12 previously called
for, avoiding duplicating instructor data into CMS section content ahead of
that table existing.

`/admin/homepage` (§13, Step 6.4) is the Admin UI that edits this seeded
data through `src/cms/actions/*` — the same Server Actions this migration
already established.

## 13. Homepage CMS editor (Step 6.4)

`/admin/homepage` (`src/app/[locale]/(admin)/admin/homepage/page.tsx`,
`src/components/admin/homepage/*`) — editors for every section already on
the "home" `cms_pages` row, plus its SEO record. Nothing beyond that: no
Media Library, Media Picker, Course/Instructor Selector, Navigation Editor,
Footer Editor, or Site Settings UI — those stay Admin Panel placeholders
(docs/authentication-architecture.md §15) for a future step.

- **Reads raw, writes through existing actions.** The page fetches
  `CmsPageService.getBySlug("home")` → `CmsSectionService.getByPageId` →
  `CmsSeoService.getById` directly (Server Component, unrestricted reads,
  same layer the public homepage's `HomepageRepository` calls) — raw,
  bilingual, *un*resolved content, since editing needs every locale's
  value, not one locale-flattened string. Every save calls the exact
  Server Actions Step 6.1 already built —
  `updateSectionAction`/`toggleSectionAction`/`reorderSectionsAction`/
  `updateSeoMetaAction` — no new action, service, or validation logic was
  added for this step.
- **One React Hook Form per section + SEO**, each `zodResolver`'d against
  the *same* `CMS_SECTION_CONTENT_SCHEMAS[sectionType]` / `seoMetaSchema`
  the server already validates against (`src/cms/validators/`) — client and
  server validate from one schema, never two. `useFieldArray` backs every
  reorderable content array (Hero highlights/statistics/slides, Why Bosla
  cards, Learning Experience capabilities, FAQ items); reorder/enable at
  the *section* level (which section is above which) still goes through
  `reorderSectionsAction`/`toggleSectionAction`, unchanged from Step 6.1.
- **`optionalLocalizedTextSchema`** (`content-blocks.validator.ts`) is the
  one real validator change: an optional `LocalizedText` field (e.g. a
  section's `subtitle`) previously required every locale non-empty the
  moment the key was present at all — fine for a script-authored payload,
  but a form always renders both an EN and an AR input, so there was no way
  to represent "intentionally omitted" other than leaving both blank. This
  schema treats "every locale blank" as equivalent to omitted while still
  rejecting a half-filled value (English only, no Arabic) as a real error.
  Applied to every optional `LocalizedText` subtitle field in the registry,
  not just the ones this editor's UI touches.
- **`courseIds: string[]`** was added to `FeaturedCoursesSectionContent`
  (§2, §5) — an ordered list of course reference IDs, editable as a
  temporary plain-text, one-ID-per-line field (no Course Selector). It is
  **not yet read by the public `FeaturedCourses` component**, which still
  renders every course from `src/data/courses.ts`; wiring the public
  homepage to respect it is future work once courses have a real table.
- **Image/instructor references** (Hero's `imageId` and
  `slides[].instructorId`, SEO's `ogImageId`) are plain ID text inputs —
  the same "temporary solution, no picker" scope boundary as `courseIds`.
- **Dirty-state detection is computed manually**
  (`use-content-dirty.ts`'s `useContentDirty`), not read from RHF's own
  `formState.isDirty` — a form with multiple `useFieldArray` instances and
  an optional field absent from the stored content (Hero's `imageId`, in
  practice) hit a real RHF inconsistency where `isDirty` read `true`
  immediately on mount with no edit made, while `dirtyFields` correctly
  stayed empty. Comparing current watched values against the resolved
  baseline directly sidesteps that internal state, and is used uniformly
  across every section form for one consistent dirty-detection mechanism.
- **Unsaved-changes warning** is a `beforeunload` listener in
  `HomepageEditor`, active whenever any section form or the SEO form is
  dirty (each form reports its own dirty state up via a callback).
- **Toasts**: `sonner`, the one new dependency this step adds — mounted
  once in `AdminChrome`, scoped to the Admin Panel only (RTL/LTR-aware).

## 15. Homepage CMS: no draft/publish distinction

Steps 6.5/6.6 originally built a full draft → preview → publish → revert
workflow on top of the Homepage CMS editor (§13): `cms_sections`/
`cms_seo_meta` as a mutable draft, an append-only `cms_page_versions` table
of immutable published snapshots, Next.js Draft Mode (`draftMode()`) for
previewing the draft through the public rendering pipeline, and a
publish/revert action pair with version-conflict detection. That entire
workflow was removed — the Homepage CMS editor is now a normal settings
page: editing a section, toggling it, reordering, or editing SEO writes
directly to the live `cms_pages`/`cms_sections`/`cms_seo_meta` rows, and the
public homepage (`src/app/[locale]/page.tsx`) always reads those same rows
via `CmsPageService.getResolvedBySlug` (through
`src/repositories/homepage.repository.ts`'s `getHomeCmsPage`) — there is no
separate published/draft state, no version history, and no preview mode.
`cms_page_versions` and `cms_pages.published_at` no longer exist
(`drizzle/0036_drop_homepage_publish_workflow.sql`).

- **Dirty-state / unsaved changes.** Unchanged: `HomepageEditor` tracks
  whether a section/SEO form has edits not yet saved
  (`src/hooks/use-unsaved-changes-guard.ts` guards page close/refresh *and*
  in-app `<Link>` navigation via a capturing click listener that checks
  `event.defaultPrevented`).

## 16. Homepage audit trail & concurrency

- **Audit trail (`cms_audit_logs`).** Append-only, write-only (no
  read/query method — no Audit Log UI exists yet). One row per: section/SEO
  save (`action: "save"` — renamed from `"save_draft"` once the
  draft/publish/preview workflow, §15, was removed; historical rows were
  backfilled to match), section enable/disable (`"toggle_section"`),
  section reorder (`"reorder_sections"`). Historical rows from that removed
  workflow may still have `action: "publish"` or `"revert"` — no code path
  writes those anymore, but `Admin.users.activity.actions.cms.publish`/
  `.revert` stay in the translation files so the Activity tab (§13's User
  Details page) can still render them. Columns:
  `action`, `page_id`, `section_id` (nullable — reorder is page-level),
  `actor_id`, `created_at`, `metadata` (jsonb, action-specific — e.g.
  `{orderedSectionIds}` for reorder). Written via `recordAuditLog`
  (`src/cms/utils/audit-log.ts`) — best-effort: the mutation has already
  succeeded by the time it's called, so a logging failure is caught and
  swallowed (logged via `logger.error`, never surfaced to the user) rather
  than turning a successful save into a reported error.
- **Concurrency.** Section/SEO saves use optimistic locking via
  `updated_at`: every save from the editor sends the `updated_at` it loaded
  the row at, and the repository's `UPDATE` includes it in the `WHERE`
  clause (`CmsSectionRepository.update` / `CmsSeoRepository.update`), so the
  check-and-write is one atomic statement, not a read-then-write race
  window. No matching row but the id still exists → `CmsActionResult`
  `code: "conflict"`; no matching row and the id is gone → `not_found`. On
  conflict, the client shows a distinct message and does **not**
  auto-discard or auto-merge the admin's local edit — the typed content
  stays exactly as the admin left it, and the next save attempt (after they
  reload to see what changed) carries a fresh baseline.
- **Resilience.** Every section/SEO form's submit and every
  `HomepageEditor` action handler (`moveSection`, `SectionEnableToggle`'s
  toggle) wraps its action call in try/catch, so a genuine network
  rejection (not a `{success:false}` response) can't leave a loading state
  stuck with no feedback. `useSaveContent`
  (`src/components/admin/homepage/use-save-content.ts`) centralizes this
  for the 7 section forms + the SEO form so the try/catch/conflict-handling
  logic exists once, not eight times.
- **Security.** Every mutating CMS service method calls
  `requireCmsAccess()` as its first step; no Server Action exposes
  audit-log data or bypasses it.
- **Accessibility.** `Accordion`, `Switch`/`SectionEnableToggle`,
  `MoveButtons`, `LocalizedTextField`/`PlainTextField`/`CmsLinkFields`,
  `SectionFormShell` — labels are associated via `htmlFor`/`id`, every
  icon-only control has `aria-label`, validation errors use
  `aria-invalid`/`aria-describedby`/`role="alert"`, and the accordion/switch
  primitives (`@base-ui/react`) handle keyboard nav and ARIA state
  natively.

## 17. Related documents

- [`architecture.md`](./architecture.md) — why this is a custom CMS and the
  bilingual content pattern every field above follows.
- [`database-overview.md`](./database-overview.md) — table definitions behind
  every editable area above.
- [`roles-and-permissions.md`](./roles-and-permissions.md) — exactly which admin
  role can edit which of the above.
- [`authentication-architecture.md`](./authentication-architecture.md) — the
  `requireCmsAccess` authorization check every CMS mutation uses, and §15
  for the Admin Panel shell / Homepage CMS editor implementation.
