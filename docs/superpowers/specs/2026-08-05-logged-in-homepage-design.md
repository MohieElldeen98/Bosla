# Bosla Logged-In Homepage — Design Spec

**Status: draft, pending approval. Once approved, this document freezes the design; implementation proceeds against it via a separate plan. No code in this document by design.**

---

## 0. Why this exists

`/` currently renders the same cinematic marketing story (`HeroSection` → `ProblemSection` → ... → `FinalCtaSection`) to every visitor, regardless of auth state. A signed-in student, instructor, or admin sees the same sales pitch a first-time guest does — no acknowledgement they already have an account, no path back into their actual workspace from the homepage itself.

This spec adds a role-aware "welcome hub" that fully replaces the marketing story for authenticated visitors, built to the same visual craft bar as the existing homepage (see `2026-07-29-heroui-homepage-navbar-rebuild-design.md`) — not a generic dashboard bolted onto the brand.

---

## 1. Scope

**In scope:**
1. `src/app/[locale]/(public)/page.tsx` branches server-side on auth state: signed-out → today's marketing sections (untouched); signed-in → the new hub.
2. A new, role-aware hub component tree under `src/components/home/logged-in/`.
3. Reusing existing data sources (`ProfileService`, `getMyDashboardAction`, `CourseService`, `InstructorApplicationService`) — no new backend/query logic.
4. New `Home.loggedIn.*` translation keys (`messages/en.json`, `messages/ar.json`).
5. A one-line comment update to `(public)/layout.tsx` (currently says "reserved, no guard" / "intentionally open to guests" — becomes accurate for a page that now branches by auth state).

**Explicitly out of scope:**
- Any change to `/me`, `/instructor`, `/admin`, or their data/services — this hub is a lighter front door into them, not a rebuild.
- Adding a name/display-name field to `AuthUser` or `SessionService` — considered and deliberately rejected (see below); display name continues to come from a separate `ProfileService.getByUserId` call, exactly as the navbar already does it.
- New routes or middleware/route-protection changes — the URL stays `/` for everyone.
- Any redesign of `/blog`, `/courses`, `/contact`, or other `(public)` routes — only `page.tsx` (the homepage) changes.
- Dark-mode toggle, CMS-driven homepage editing (`_draft-homepage-cms/`) — unrelated, untouched.

**Decision recorded — `AuthUser` stays JWT-only:** `SessionService.getCurrentUser()` is deliberately DB-free (*"Deliberately does not touch ProfileRepository — role comes from the Supabase session JWT... so route protection works from a single fast call regardless of the `profiles` table's availability"*) and is what every `requireAuth`/`requireGuest`/`requireRole` guard calls on nearly every protected page load. Folding profile data into it would make route-gating depend on the `profiles` table being up and add a DB round-trip to every guard call, most of which never need a name. Rejected; `ProfileService.getByUserId` stays a separate, explicit call at the few sites (navbar, this new hub) that actually render a name.

---

## 2. Routing & rendering

```
Home() Server Component  — src/app/[locale]/(public)/page.tsx
  user = SessionService.getCurrentUser()
  if (user) → <LoggedInHome user={user} locale={typedLocale} />
  else       → existing marketing sections (unchanged)
```

- No new route, no middleware rule, no redirect. `(public)/layout.tsx` (Navbar/Footer chrome) is untouched — the navbar already reflects auth state independently via `useSession()`.
- The locale layout is already `export const dynamic = "force-dynamic"`, so per-user personalization here requires no rendering-mode change.
- `generateMetadata` (OG/Twitter tags) is untouched — link previews are fetched unauthenticated, so the marketing title/description/OG image stay correct regardless of this change.

---

## 3. Data per role

| Role | Primary data | Source | Notes |
|---|---|---|---|
| Display name/avatar (all roles) | `resolveDisplayName(profile, user)`, `profile?.avatarUrl` | `ProfileService.getByUserId(user.id)` | Same helper the navbar already uses; degrades to email if no profile name set. |
| Student | `continueLearning[0]` (course title, cover, progress, resume-lesson) | `getMyDashboardAction(locale)` | Deliberately the lighter call — skips the certificates fetch + activity-timeline computation that `getMyWorkspaceOverviewAction` (used by `/me`) layers on top. |
| Student, no in-progress course | 4 recommended courses | `CourseService.searchResolved({ status: "published", onlyActive: true, pageSize: 4 }, locale)` mapped to the existing `CourseCard` | Covers first-time signups with nothing enrolled yet. |
| Instructor | Course counts by status | `CourseService.getMyCourseCounts(user)` | Same call the Instructor Panel's own dashboard already makes. |
| Admin / Super Admin | Pending instructor-application count | `InstructorApplicationService.searchResolved({ status: "pending", pageSize: 1 }, locale).total` | Same pattern the Admin Panel dashboard already uses for its stat row. |

---

## 4. Content structure by role

Validated against current (2026) SaaS/e-learning UX pattern research before finalizing — see Sources: the two consistent findings that shaped this section were (a) **north-star-first layout** — the single most valuable next action gets the lead position, not a wall of stats — and (b) **progressive disclosure** — a landing surface should show less than the full workspace and earn the right to show more, rather than duplicating it. Both directly support keeping this hub deliberately thinner than `/me`.

1. **Greeting hero** — "Welcome back, {name}" on the brand's dark night-sky atmosphere (Section 5), no marketing copy. One north-star action per role:
   - Student with an in-progress course: the existing `ContinueLearningHero` component (verbatim reuse — same visual language as `/me`, zero new UI for this part).
   - Student with nothing in progress: a "Browse Courses" CTA + the 4-course recommended grid.
   - Instructor: compact published/in-review counts + primary "Go to Instructor Panel" CTA.
   - Admin/Super Admin: pending-applications hint (shown only if > 0) + primary "Go to Admin Panel" CTA.
2. **Quick links row** — 3 small link cards, role-specific, secondary to the hero's north-star action:
   - Student: My Courses / Certificates / Profile (`/me/courses`, `/me/certificates`, `/me/profile`).
   - Instructor: My Courses / Students / Earnings (`/instructor/courses`, `/instructor/students`, `/instructor/earnings`).
   - Admin/Super Admin: Courses / Users / Orders (`/admin/courses`, `/admin/users`, `/admin/orders`).

Nothing below the quick-links row — no re-run of the marketing story, no duplicated `/me` widgets (stats grid, certificates card, recent activity feed all stay exclusive to `/me`).

---

## 5. Visual & craft direction

This hub must read as an extension of the existing homepage, not a different product wearing the same navbar. Concretely:

- **Reuse, don't reinvent, the established atmosphere**: the greeting hero sits on the same `.night-sky-nebula` + `.hero-atmosphere-glow` dark, brand-hued gradient treatment already used behind `HeroSection`/`ProblemSection` (same OKLCH values, same 72s/7s drift timing) — not a new background treatment.
- **One Restless Section Rule applies here too** (per DESIGN.md): only the hero's first-paint entrance gets authored motion. The quick-links row holds still — it does not need its own animation to feel intentional.
- **Motion Family, not a generic fade-up**: the hero reuses the homepage's own `CompassMark` component verbatim as a settling accent next to the greeting — same `.compass-needle` first-paint CSS settle (`bosla-compass-settle`, zero JS) the marketing hero already uses, not a new animation. The greeting text and role card stagger in via the same `.hero-reveal` + `--reveal-delay` CSS convention `HeroContent`/`CoursesSection` already use elsewhere on this site — plain CSS, no JS, works in a Server Component.
- **Typography and color stay identical**: IBM Plex Sans / IBM Plex Sans Arabic, OKLCH palette at hue 265.5 — no new tokens introduced.
- **No stock icons or illustrations** — Lucide icons only (already the project's icon library), per DESIGN.md's explicit rule against reaching for outside imagery when the system's own motifs exist.
- **Everything gated behind `prefers-reduced-motion: no-preference`**, with a fully visible static fallback — consistent with every other animated moment on the site (`.hero-reveal`/`.compass-needle` are both already gated this way in `globals.css`).

**Implementation skills to invoke** (this is a refinement within an already-defined design system, not a greenfield surface):
- `impeccable` — drives DESIGN.md-compliant craft and the production-quality floor for the actual build; this is the same skill used for the original homepage/navbar rebuild.
- **Correction from the initial draft of this spec**: GSAP (`gsap-core`/`gsap-react`) is *not* used here. Verified during planning that the homepage's own equivalent moments — `HeroContent`'s fade-up, `CompassMark`'s needle settle — are deliberately plain CSS, not GSAP; per `globals.css`'s own comment, "GSAP owns all storytelling movement" (the navbar's pointer-driven indicator, the marketing homepage's scroll-pinned sequences) while simple first-paint reveals use the `.hero-reveal`/`.compass-needle` CSS convention instead. This hub has no storytelling/scroll-driven motion, so it follows the CSS convention, matching the pattern it's actually adjacent to.

---

## 6. i18n

**Correction from the initial draft of this spec**: message files are organized by feature file, not by nested key — `messages/en/home.json` / `messages/ar/home.json` already hold flat top-level namespace keys (`Hero`, `Problem`, `CoursesSection`, etc.), all merged into one flat messages object (`src/i18n/messages.ts`). This adds one new top-level key, `LoggedInHome`, to both `home.json` files (not a new file — no change to the `namespaces` array in `src/i18n/messages.ts`): `LoggedInHome.hero`, `LoggedInHome.student`, `LoggedInHome.instructor`, `LoggedInHome.admin`, `LoggedInHome.quickLinks` — greeting, per-role CTA labels, quick-link labels/descriptions, empty-state copy ("browse courses" prompt for students with nothing in progress). Exact keys finalized during implementation.

---

## 7. Edge cases

- **`emailVerified: false`**: not handled by this spec — no existing verification-nudge pattern was found elsewhere to reuse, and the user didn't ask for one; out of scope.
- **RTL (`ar` locale)**: hero layout, compass accent, and quick-links row must mirror correctly — same requirement every existing homepage section already meets.
- **New instructor with zero courses**: counts render as `0`, CTA still points to `/instructor` (no special empty state needed — the Instructor Panel itself already has one).
- **Admin with zero pending applications**: the hint line simply doesn't render (matches the existing `StatCard` conditional-hint pattern on `/admin`).

---

## 8. Verification plan

- `npm run typecheck`, `npm run lint`, `npm run build` all clean; confirm the legacy-Safari `postbuild` guard (see root `CLAUDE.md`) still passes since this adds new client-side motion code.
- Visual check (real browser, both locales): signed-out `/` unchanged; signed-in `/` for each of the four roles (student with an in-progress course, student with none, instructor, admin); RTL mirroring; `prefers-reduced-motion` respected.
- Confirm the navbar's own auth-aware rendering (`useSession`) still matches the page body's state with no flash of mismatched content.
- No regression sweep needed on `/me`, `/instructor`, `/admin` — none of their code changes.

---

## Sources

Web research consulted while shaping Section 4's "north-star-first" / "progressive disclosure" content decisions:
- [The Anatomy of High-Performance SaaS Dashboard Design: 2026 Trends & Patterns](https://www.saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns)
- [7 SaaS UI Design Trends for 2026, Shown With Real Screens](https://www.saasui.design/blog/7-saas-ui-design-trends-2026)
- [51 SaaS Welcome Screen UI Design Examples in 2026](https://www.saasframe.io/categories/welcome-screen)
- [E-learning platform design guide](https://www.justinmind.com/ui-design/how-to-design-e-learning-platform)

No further open items — this spec is ready for review.
