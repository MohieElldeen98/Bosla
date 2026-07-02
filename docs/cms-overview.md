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

## 15. Homepage draft, preview, publishing & versioning (Step 6.5)

Everything in §13 (the Homepage CMS editor) saves straight to the live
`cms_pages`/`cms_sections`/`cms_seo_meta` rows — that was fine as long as
those rows *were* the public site. Step 6.5 splits that in two: those same
tables become the **draft** (unpublished working copy), and a new
`cms_page_versions` table holds immutable **published** snapshots. The
public homepage reads only the latter, so a draft edit is invisible to
visitors until an admin explicitly publishes.

- **Draft.** No schema or save-path change from §13 — editing/saving a
  section, toggling it, reordering, or editing SEO still goes through the
  exact same actions/services/validators, writing to the same tables. The
  only difference is what those writes now mean: "draft," not "live."
- **Published (`cms_page_versions`).** One row per publish: `page_id`,
  `version` (integer, starts at 1, unique per page), `snapshot` (jsonb — the
  full page: raw/bilingual page title+slug, every section's `id`/
  `section_type`/`is_enabled`/`position`/`content`, and SEO, all in the same
  unresolved shape `cms_sections`/`cms_seo_meta` already store), `created_at`
  /`created_by`, `published_at`/`published_by`. Append-only: nothing ever
  updates or deletes a version row. "The current published version" is
  always the highest `version` for a page — there's no separate "this is
  the live one" pointer, since this step doesn't build scheduling/staged
  releases (see Scope below). `cms_pages.published_at` is a denormalized
  copy of the latest version's `published_at`, kept for a cheap "has this
  page ever been published" check without a join.
- **Publish flow** (`CmsPageVersionService.publish`,
  `src/cms/services/page-version.service.ts`): `requireCmsAccess` → read
  every current draft section + SEO record → **validate all of it** against
  the same schemas the editor already validates against
  (`validateSectionContent`, `seoMetaSchema` — reused, not duplicated; this
  catches drift, e.g. a section saved before a content-schema change) →
  compute `next version = latest + 1` → build the snapshot → insert the
  version row **and** stamp `cms_pages.published_at` in one DB transaction
  (`CmsPageVersionRepository.createAndMarkPublished`) → `revalidatePath` the
  public homepage route so the change is live immediately, not after the
  next ISR window (§13's `revalidate = 60` still governs the *unpublished*
  case — an idle page re-checks the DB at most once a minute; a publish
  bypasses that wait).
- **Revert flow** (`CmsPageVersionService.revertToPublished`): restores the
  draft tables to match the *latest published* snapshot, discarding
  unpublished draft edits — it does **not** change which version is
  published (publishing again afterward creates a new version from the
  now-restored content). Only the immediately-previous published state is
  restorable; there is no version history browser or arbitrary-version
  rollback (see Scope below).
- **Preview flow.** Reuses the public rendering pipeline instead of a
  separate preview renderer, via Next.js's built-in Draft Mode
  (`draftMode()` from `next/headers`): `src/app/[locale]/page.tsx` branches
  purely on `draftMode().isEnabled` — enabled, it fetches through
  `HomepageService.getDraftSections`/`getHomeCmsPageDraft` (live draft
  tables, via the unchanged §13 `CmsPageService.getResolvedBySlug`);
  disabled (the normal, public case), it fetches through
  `HomepageService.getSections`/`getHomeCmsPage` (the published snapshot,
  via `CmsPageVersionService.getPublishedResolvedBySlug`). Same JSX, same
  `SectionRenderer`, zero duplicated rendering logic — only the data source
  changes. `/admin/homepage/preview` and `/admin/homepage/preview/exit`
  (`src/app/[locale]/(admin)/admin/homepage/preview/`) are Route Handlers,
  not pages, specifically so they're never wrapped by `(admin)/layout.tsx`'s
  `AdminShell` — enabling draft mode redirects straight to the real `/​{locale}`
  homepage, chrome-free, exactly what a visitor would see. A `PreviewBanner`
  (`src/components/layout/preview-banner.tsx`) renders only while draft mode
  is enabled, with a link back to the exit route. Next.js automatically
  treats a draft-mode request as dynamic, bypassing static/ISR caching, so
  preview always reflects the current draft with no extra cache-busting
  logic.
- **Dirty-state / unsaved changes.** Two independent notions, both surfaced
  in `HomepageEditor`: *unsaved* (a section/SEO form has edits not yet
  saved to the draft — unchanged from §13, still a `beforeunload` listener)
  and *unpublished* (the draft differs from the latest published snapshot —
  a new "Unpublished changes" badge, from `CmsPageVersionService
  .getPublishStatus`'s section-`updated_at`-vs-`published_at` comparison).
  §13's `beforeunload`-only guard covered page close/refresh but not
  in-app client-side `<Link>` navigation (which never fires
  `beforeunload`); `src/hooks/use-unsaved-changes-guard.ts` adds a
  document-level capturing click listener that `window.confirm()`s and, on
  cancel, calls `event.preventDefault()` before Next's own `<Link>` handler
  (which checks `event.defaultPrevented`) gets a chance to navigate — one
  hook now covers close/refresh/leave/route-change uniformly.
- **Scope (deliberately not built this step).** No version history browser
  (only "latest published" is ever read), no activity log, no approval/
  review workflow, no scheduled/future publishing, no rollback beyond the
  single most-recent published version — `cms_page_versions`' shape (a
  full row per version, not a diff) supports all of these later without a
  migration, but none of the logic for them exists yet.

## 16. Homepage QA, audit, and concurrency hardening (Step 6.6)

Step 6.5 built draft/preview/publish/revert/versioning; this step doesn't
add a new CMS capability, it hardens that workflow for production: an
audit trail, concurrency-conflict protection, and the resilience/
performance/security review the checklist below records.

- **Audit trail (`cms_audit_logs`).** Append-only, write-only for now (no
  read/query method — no Audit Log UI is explicit scope here; a future step
  builds the viewer against this same table). One row per: section/SEO
  save (`action: "save_draft"`), section enable/disable
  (`"toggle_section"`), section reorder (`"reorder_sections"`), publish
  (`"publish"`), revert (`"revert"`). Columns: `action`, `page_id`,
  `section_id` (nullable — publish/revert/reorder are page-level),
  `actor_id`, `created_at`, `metadata` (jsonb, action-specific — e.g.
  `{version}` for publish, `{orderedSectionIds}` for reorder). Two write
  paths, deliberately different:
  - Section/SEO/toggle/reorder go through `recordAuditLog`
    (`src/cms/utils/audit-log.ts`) — best-effort: the mutation has already
    succeeded by the time it's called, so a logging failure is caught and
    swallowed (logged via `logger.error`, never surfaced to the user) rather
    than turning a successful save into a reported error.
  - Publish/revert write their audit row **inside** the same DB transaction
    as the version insert / draft restore (`CmsPageVersionRepository
    .createAndMarkPublished` / `.restoreDraftFromSnapshot`) — a failed audit
    insert rolls back the whole publish/revert, consistent with "never
    partially publish."
- **Concurrency.** Two independent mechanisms, both reusing the existing
  `CmsActionResult` `code: "conflict"` (already part of the type from
  Step 6.1's page-slug-conflict case — no new result shape):
  - **Section/SEO saves** — optimistic locking via `updated_at`. Every save
    from the editor sends the `updated_at` it loaded the row at; the
    repository's `UPDATE` includes it in the `WHERE` clause
    (`CmsSectionRepository.update` / `CmsSeoRepository.update`), so the
    check-and-write is one atomic statement, not a read-then-write race
    window. No matching row but the id still exists → `conflict`; no
    matching row and the id is gone → `not_found`. `SeoMeta` gained an
    `updatedAt` field for this (previously stripped from the type even
    though the DB column always existed).
  - **Publish/revert** — version-based. The editor's status line remembers
    the `publishedVersion` it loaded; publishing/reverting sends it back as
    `expectedPublishedVersion`, and the service compares it against the
    actual latest version before writing — if someone else published in
    between ("if another admin publishes while someone is editing"), this
    returns `conflict` instead of silently publishing on top of a baseline
    the admin never saw. The `(page_id, version)` unique index is the
    last-resort guard for the rarer true-simultaneous-publish race that
    slips past that check (`isUniqueViolation`,
    `src/cms/repositories/page-version.repository.ts`) — caught and mapped
    to the same `conflict` code, not a generic error.
  - On any conflict, the client shows a distinct message and does **not**
    auto-discard or auto-merge the admin's local edit/intent ("do not
    silently replace data") — for publish/revert it re-fetches
    `getPublishStatusAction` so the status line reflects reality; for a
    section/SEO form, the typed content stays exactly as the admin left it,
    and the next save attempt (after they reload to see what changed) will
    carry a fresh baseline.
- **Resilience.** Every section/SEO form's submit and every
  `HomepageEditor` action handler (`handlePublish`, `handleRevert`,
  `moveSection`, `SectionEnableToggle`'s toggle) now wraps its action call
  in try/catch — previously, an action call that *rejected* (a genuine
  network failure, not a `{success:false}` response) could leave a loading
  state stuck and show no feedback at all. `useSaveContent`
  (`src/components/admin/homepage/use-save-content.ts`) centralizes this
  for the 7 section forms + the SEO form so the try/catch/conflict-handling
  logic exists once, not eight times.
- **Performance.** `admin/homepage/page.tsx` used to call
  `CmsPageVersionService.getPublishStatus(pageId)`, which re-fetched the
  page and its sections internally — data the caller already had in scope
  from its own `Promise.all`. Split into a pure `computePublishStatus(page,
  sections, seo, version)` (no I/O) plus a thin `getLatestVersion(pageId)`
  for the one query the caller didn't already have; `getPublishStatus`
  itself still exists, fetching everything, for callers (like the
  `getPublishStatusAction` Server Action) that don't have the data lying
  around already. No caching/revalidation behavior changed — `revalidate =
  60` and the publish-time `revalidatePath` call from Step 6.5 are
  unchanged and were already correctly scoped (only on publish, only for
  the "home" slug).
- **Security.** No authorization logic changed — every mutating CMS service
  method still calls `requireCmsAccess()` as its first step (verified
  across all seven services), so the new concurrency/audit parameters are
  additive plumbing behind the same gate, not a new access path. No new
  Server Action exposes audit-log data or bypasses `requireCmsAccess`.
- **Accessibility.** Reviewed (`Accordion`, `Switch`/`SectionEnableToggle`,
  `MoveButtons`, `LocalizedTextField`/`PlainTextField`/`CmsLinkFields`,
  `SectionFormShell`) — labels are associated via `htmlFor`/`id`, every
  icon-only control has `aria-label`, validation errors use
  `aria-invalid`/`aria-describedby`/`role="alert"`, and the accordion/switch
  primitives (`@base-ui/react`) handle keyboard nav and ARIA state
  natively. No changes were needed.
- **Scope (deliberately not built this step).** No Activity Log page/Audit
  viewer, no notifications or email alerts, no multi-user collaboration UI
  (presence, live cursors, comments), no Media Library/Course Management/
  Scheduling/Analytics/Dashboard widgets — same exclusions as Step 6.5,
  reiterated because "audit trail" and "concurrency" both sound adjacent to
  several of these; this step only builds the backend infrastructure a
  future step would read from.

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
