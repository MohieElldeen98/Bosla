# Bosla Homepage + Navbar Rebuild on HeroUI — Design Spec

**Status: draft, pending approval. Once approved, this document freezes the design; implementation proceeds against it via a separate plan. No code in this document by design.**

---

## 0. Why this exists

The current homepage is CMS-driven (`HomepageService.getSections()` renders admin-configurable sections via `SectionRenderer`), built on shadcn/ui. This spec replaces it with a static, hand-authored homepage built on HeroUI (`@heroui/react` v3), plus a full rewrite of the site-wide `Navbar`, plus removal of the global loading-overlay system (`NavigationLoader`/`BoslaPageLoader`). The motivations, as given: reduce JS weight and code surface, stop hand-building UI HeroUI already solves (positioning, focus trap, portals, drawer animation), and get a homepage that reads as a deliberately-designed SaaS product rather than a CMS template.

This is **not** a rewrite of Bosla's visual identity. The indigo brand color, IBM Plex Sans/Sans Arabic + Marhey fonts, and the compass logo stay exactly as they are — only the underlying component library and the homepage's specific content structure change.

---

## 1. Scope

**In scope:**
1. A new, static (non-CMS) homepage at `[locale]/(public)/page.tsx`.
2. A full rewrite of `Navbar` (site-wide — every `(public)` route uses it, not just the homepage).
3. Removal of `NavigationLoader` + `BoslaPageLoader` and their route-transition-overlay behavior, site-wide.
4. Adding `@heroui/react` + `@heroui/styles` as the component layer for all of the above (already installed and verified compatible — React 19.2.4, Tailwind v4).
5. A Bosla-brand ↔ HeroUI theme-token bridge in `globals.css`.

**Explicitly out of scope (not touched by this work):**
- `HomepageService`, `SectionRenderer`, and the CMS section-editing Admin Panel UI — they keep existing for potential future use, just disconnected from the live homepage route.
- Any other page (`/courses`, `/blog`, `/checkout`, dashboards, admin panel, auth pages) — none of these get re-skinned in HeroUI as part of this work. Only the shared `Navbar` and `Footer`'s visual consistency with it changes; page bodies elsewhere are untouched.
- Auth, session, notifications, and i18n-routing logic (`useSession`, `getMyProfileAction`, `signOutAction`, `SessionClientService`, `isRoleAllowed`, `resolveDisplayName`, the notification Server Actions, locale-switch routing) — all reused as-is by the new navbar. Only their UI shell is rewritten.
- shadcn/ui itself is not removed from the project — it remains installed and in use everywhere outside the homepage/navbar/loading-overlay. This spec does not migrate the rest of the app.
- Dark mode: the project has no working dark-mode toggle today (`.dark` CSS tokens exist in `globals.css` but are never applied — no `next-themes`, no toggle anywhere in the codebase). This work keeps that status quo; it does not add a dark-mode switcher.

---

## 2. Routing & file structure

- The current `src/app/[locale]/(public)/page.tsx` (CMS-driven) moves to `src/app/[locale]/(public)/_draft-homepage/page.tsx`. The leading underscore excludes it from Next.js routing entirely (private folder convention, already confirmed to work in this codebase) — the file is fully preserved and readable, just unreachable by any URL.
- A new `src/app/[locale]/(public)/page.tsx` is written from scratch: a plain async Server Component rendering the six sections below in fixed order. No `generateMetadata` CMS lookup — metadata comes from `Metadata.title`/`Metadata.description` translation keys (the same fallback the current `generateMetadata` already uses when no CMS page exists).
- New homepage-specific components live under `src/components/home/` (a new directory), replacing `src/components/sections/*` as the homepage's component source. `src/components/sections/*` and `section-renderer.tsx` are left in place, unused by the live route (matches the "CMS code stays, just disconnected" scope decision above).

---

## 3. Design-system bridge: Bosla brand → HeroUI tokens

HeroUI's theming (`@heroui/styles`) uses its own CSS variable names, layered via Tailwind v4's `@theme`. The naming does **not** match shadcn's 1:1 — most importantly, HeroUI's `--accent`/`--accent-foreground` is the **main brand color slot** (shadcn's equivalent is `--primary`/`--primary-foreground`), not shadcn's own `--accent` (a pale hover-state tint already read directly by shadcn's `dropdown-menu`/`combobox`/`avatar`/`select` primitives and 13 other call sites app-wide, including 15+ occurrences inside the admin's `RichTextEditor.tsx`, via `bg-accent`/`hover:bg-accent`/`text-accent-foreground`). **These are two different tokens that happen to share a name.**

Two fixes were considered and rejected before landing on the one below:
1. **Overwrite `:root`'s `--accent` directly.** Rejected — verified via `git diff` before ever committing that this silently breaks every shadcn hover/highlight state on every page outside this rebuild, since shadcn stays installed and in active use elsewhere (Section 1).
2. **Scope the override to a `[data-theme="bosla"]` block applied only to the navbar/homepage DOM subtree**, leaving `:root` untouched. Rejected after verifying that HeroUI's `Popover`/`Drawer` (built on `react-aria-components`) portal their overlay content to `document.body` by default — a scoped override would correctly theme the header's inline elements (logo, links, trigger buttons) but silently fail for the actual portaled dropdown/drawer panel content, which renders outside that DOM subtree entirely and wouldn't inherit the scoped variable.

**The fix: rename shadcn's token, then set `--accent` globally.** Rename shadcn's existing `--accent`/`--accent-foreground` (in `@theme inline`, `:root`, and `.dark`) to `--tint`/`--tint-foreground` — same values, new name, and update every one of its ~30 call sites across 13 files to the new class names (`bg-accent` → `bg-tint`, etc.) — freeing `--accent` for HeroUI's exclusive, global use with zero collision and zero portal-scoping fragility. `--surface`, `--danger`, `--danger-foreground` are new names with no shadcn equivalent, so those go directly in `:root` without any rename step. The mapping, using Bosla's actual current oklch values:

| Bosla / shadcn token | Value | → New token |
|---|---|---|
| shadcn's old `--accent` | `oklch(0.94 0.03 265.5)` | renamed to `--tint` |
| shadcn's old `--accent-foreground` | `oklch(0.33 0.13 265.5)` | renamed to `--tint-foreground` |
| `--primary` | `oklch(0.478 0.192 265.5)` | → new `--accent` (HeroUI's brand slot) |
| `--primary-foreground` | `oklch(0.985 0 0)` | → new `--accent-foreground` |
| `--background` | `oklch(0.995 0.002 265.5)` | `--background` (same name, unchanged) |
| `--foreground` | `oklch(0.16 0.015 265.5)` | `--foreground` (same name, unchanged) |
| `--card` | `oklch(1 0 0)` | → `--surface` (new name, no collision) |
| `--destructive` | `oklch(0.577 0.245 27.325)` | → `--danger` (new name, no collision) |
| `--destructive` (foreground) | `oklch(0.985 0 0)` | → `--danger-foreground` (new name, no collision) |
| `--radius` | `0.625rem` | `--radius` (same name, unchanged) |

`--achievement`/`--achievement-foreground` (Bosla's brass accent for earned/urgent moments — deals, certificates) has no HeroUI equivalent slot; it stays a Bosla-specific custom property, applied manually via Tailwind arbitrary values where needed (as it already is today), not through HeroUI's theme system.

Fonts and the logo are unaffected by either token system — `--font-sans`/`--font-article`/`--font-script` (next/font-managed) and the existing SVG mark carry over unchanged.

Implementation and the exact file list for the rename are in the plan's Task 2 — this is a larger, more mechanical change than originally scoped (13 files instead of 1), a deliberate tradeoff accepted in favor of a structurally correct fix over a smaller one with a known gap.

---

## 4. Navbar (full rewrite, site-wide)

Renders in `(public)/layout.tsx`, so every public page (homepage, courses, blog, etc.) picks up the new design automatically — this is a site-wide visual change, not homepage-scoped.

**Structure:** logo/brand mark (start) — `Home` / `Courses` / `Blog` links, fixed (no longer CMS-driven — `(public)/layout.tsx` drops its `CmsNavigationService.getResolvedByLocation("header", ...)` fetch) — right-aligned action cluster: notification bell (`Badge` count on a `Button`, contents in a `Popover`), user avatar menu (`Avatar` trigger, `Popover` containing workspace link / admin link if applicable / sign out — same items as today), language switcher (`Popover`, same locale-switch logic as today). Signed-out state: plain "Sign In" / "Get Started" buttons, no avatar/bell.

Mobile: hamburger button opens a HeroUI `Drawer` containing the same links + language switcher + auth actions, replacing today's shadcn `Sheet`.

**Dropped from today's navbar:** the CMS-managed link list, and the author-only "My Articles" conditional link (not in the requested link set). If a future need for it resurfaces, it's a small addition to the new fixed link list, not a blocker for this spec.

**Preserved exactly, only the wrapper JSX changes:** `useSession()`, `getMyProfileAction`, `signOutAction` + `SessionClientService.signOut()`, `isRoleAllowed`, `resolveDisplayName`, `UserAvatar`'s data logic, `NotificationBell`'s Server Actions and 45s poll interval, `LanguageSwitcher`'s `router.replace(pathname, { locale })` logic.

**UX requirements carried from pattern research:** sticky nav gets explicit `padding-top` compensation on `<main>` equal to nav height (prevents content overlap — a common sticky-nav bug), all interactive targets ≥44×44px, visible focus rings preserved (HeroUI's defaults already do this), `prefers-reduced-motion` respected for the drawer's open/close animation.

Files rewritten: `src/components/layout/navbar.tsx`, `src/components/layout/navbar-user-menu.tsx`, `src/components/layout/language-switcher.tsx` (UI shell only, per the scope note above), `NotificationBell`'s trigger/dropdown markup (its data-fetching top section is untouched).

---

## 5. Homepage sections

Six sections, fixed order, no CMS. Copy is written directly during implementation (fresh, SaaS-appropriate, not reused from the current site) — no separate content-review gate before code gets written.

1. **Hero** — headline, one-line subhead, primary CTA ("Browse Courses" → `/courses`), secondary CTA (sign up). No device mockups/illustrations — text + CTA only, matching the "accessible, calm, professional" direction from pattern research rather than a busy hero.
2. **Why Bosla** — 3–4 value props (evidence-based content, practicing-professional instructors, bilingual, certificates) in an icon+text grid. Lucide icons (already the project's icon library — `iconLibrary: "lucide"` in `components.json`), never emoji.
3. **Courses** — real featured/popular courses queried live via the existing `CourseService` (same data source as today — this section is the one place real dynamic data still flows into an otherwise static page), rendered in HeroUI `Card`.
4. **FAQ** — HeroUI's native `Accordion` component (confirmed available), fixed set of Q&As (drafted alongside the other copy).
5. **Contact CTA** — one banded section: headline + button linking to the existing `/contact` page. No embedded form (per prior agreement).
6. **Footer** — same content/links as today's `Footer` component (product/company/resources columns, social links, newsletter), visual treatment brought in line with the new navbar/homepage but the component itself and its CMS-sourced link data are **not** rewritten — only restyled if needed for visual consistency. (`Footer` was not part of the "make it static" decision; it's shared chrome like the navbar, but its content model wasn't flagged as a problem, so it's left alone functionally.)

---

## 6. Loading-overlay removal

- Delete `src/components/layout/NavigationLoader.tsx` and `src/components/brand/BoslaPageLoader.tsx` (confirmed via `grep`: `BoslaPageLoader` has exactly one other consumer, handled below; nothing else references `NavigationLoader`).
- Remove `<NavigationLoader />` and its wrapping `<Suspense>` from `src/app/[locale]/layout.tsx`.
- Replace the body of `src/app/[locale]/loading.tsx` with a minimal fallback (small centered spinner, no full-screen scene, no dot-grid/glow decoration) — Next.js still needs *some* Suspense fallback for route segments that stream in, so this file isn't deleted, just made lightweight.

---

## 7. Verification plan

- `npm run typecheck`, `npm run lint`, `npm run build` (production) all clean.
- Visual check (real browser) of: new homepage (both locales), every public page that shares the new `Navbar` (courses, blog, a course detail page) to confirm the site-wide nav change didn't break anything, signed-in and signed-out navbar states, mobile drawer, language switch, sign-out flow.
- Confirm `/checkout/[slug]` unauthenticated-redirect flow (fixed earlier this session — React error #310) and the ChunkLoadError auto-recovery (also fixed earlier this session) are both unaffected — neither depends on `NavigationLoader` or the CMS homepage, but worth a direct re-check since this touches the same root layout.
- Confirm `_draft-homepage/page.tsx` genuinely 404s / is unreachable at its old URL path.
- No regression sweep of admin CMS homepage-editing screens is needed (out of scope, untouched), but confirm the Admin Panel itself still builds/loads (it imports `HomepageEditor.tsx`, which still exists, just orphaned from the live route).

---

## 8. Ready-made navbar template: researched, not available for free

Before committing to building the navbar from HeroUI primitives, checked whether a genuinely free, ready-made "avatar + notification badge + dropdown" navbar template exists anywhere, to avoid hand-building something a library already ships. Checked: HeroUI Pro (`heroui.pro/docs/react/components/navbar` — paid), `shadcn.io`'s "Navbar Notification Bell" block (paid, and not affiliated with official shadcn/ui despite the name), ShadcnBlocks.com and ShadcnDesign Pro Blocks (paid). This exact combination — a polished, assembled navbar with avatar/badge/dropdown — is a paid-tier product across the ecosystem; every free tier (official shadcn, official HeroUI) ships the underlying primitives (`Avatar`, `Badge`, `Popover`/`DropdownMenu`, `Drawer`) but not a pre-assembled result. Decision: build the navbar by composing HeroUI's free primitives directly (Section 4) — zero cost, lower risk (same approach already used successfully elsewhere in this codebase today), no dependency on a third-party template's compatibility with React 19/HeroUI's own token system.

No further open items — this spec is ready for implementation.
