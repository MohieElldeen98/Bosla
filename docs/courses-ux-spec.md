# Bosla Courses — Product & UX Specification

**Status: draft, pending approval. Once approved, this document freezes the UX for the Courses experience; implementation proceeds against it phase by phase. No code in this document by design.**

---

## 0. Grounding: what Bosla already is

This spec is an evolution of the existing product, not a blank page. Everything below extends what's live:

- **Visual language.** Indigo primary (`oklch(0.478 0.192 265.5)`), a pale-indigo accent, `0.625rem` radius scale, Inter (Latin) + IBM Plex Sans Arabic, semantic tokens with a complete `.dark` set. The blog module established the house patterns: muted hero band, card grids with gradient+icon placeholders, numbered pagination, skeleton-free ISR pages with `BoslaPageLoader` for navigation.
- **Existing surfaces.** `/courses` (listing + filters + pagination), `/courses/[slug]` (details), `/courses/[slug]/learn/[lessonId]` (Bosla Player: video, modules sidebar, quizzes, completion toggle), `/checkout/[courseSlug]`, `/dashboard`.
- **Data realities.** The schema already models specialties → categories → courses (level, language, price/originalPrice, free flag, duration, certificate flag, featured, objectives/requirements/audience, cover/thumbnail/trailer), instructors (with medical `qualification`), modules → lessons (`isPreview`, duration, video, rich body), enrollments, lesson progress, raw `video_events`, quizzes, coupons and orders. It deliberately does **not** yet have: ratings/reviews, notes, lesson resources/attachments, certificates. The spec treats those as designed-for-later slots, not launch requirements.
- **Bilingual.** Every layout decision below is written in `start`/`end` terms.

### The pattern research, distilled

What we take (and deliberately don't take) from the reference platforms:

| Platform | Take | Leave |
|---|---|---|
| Udemy | Sticky purchase sidebar; curriculum accordion with playable previews; "what you'll learn" checklist; countdown timers on time-limited deals; badge vocabulary (discount, bestseller, new) | Perpetual fake discounts, review-count worship |
| Coursera | Outcome-first framing; clean syllabus hierarchy; calm typography-led detail pages | Institutional heaviness, multi-tier enrollment complexity |
| Skillshare | Frictionless "continue watching" resume; class projects energy | Autoplaying noise, subscription-only mental model |
| Kajabi / Teachable / Thinkific | Creator-branded, distraction-free players (no marketplace pulling learners away mid-lesson) | Template blandness, weak catalog/browse UX |
| Maven | Instructor credibility as the centerpiece; scarcity used honestly | Cohort-only mechanics (Bosla is self-paced) |
| Domestika | Cinematic trailers; strong visual identity; premium feel of the player | Heavy media pages that load slowly |

**The synthesis:** Udemy's information completeness and merchandising energy (badges, real-deal countdowns), delivered with Coursera's calm, inside Kajabi's distraction-free walls, with Domestika's pride in the player. Urgency is welcome when it's real: countdowns run against genuine, admin-scheduled promotion end times — never a timer that resets on refresh. Bosla's version of "premium" is: *fast, honest, credentialed, and bilingual.*

---

## 1. The learning journey (the spine of everything)

One connected flow; every screen exists to hand the user to the next:

```
Discover → Evaluate → Decide → Pay → Onboard → Learn → Complete → Return
(listing)  (details)  (purchase (checkout) (first-  (player)  (certificate (dashboard,
                       area)               lesson                readiness)  next course)
                                           handoff)
```

Design rules that fall out of this:

1. **One course identity block everywhere.** Thumbnail + title + instructor + level render identically (one component, three densities) on cards, checkout, dashboard, and the player's header. The user should never re-orient.
2. **Progress is a single visual primitive** (bar + fraction label) reused on dashboard cards, curriculum rows, the player sidebar, and the listing card's enrolled state.
3. **The curriculum tree is one component with three modes:** *marketing* (details page: locked rows, playable previews), *learning* (player sidebar: navigation + completion), *summary* (dashboard: collapsed, counts only). Freeze its data contract before building any of the three surfaces.
4. **Enrollment state transforms surfaces instead of duplicating them.** The same details page shows "Buy" to a visitor and "Continue learning — Lesson 12" to a student. The same card shows price or progress. No separate "owned course page."

---

## 2. Courses listing page (`/courses`)

### Layout
- **Hero band** on the muted background (same band as the blog listing — the house pattern): page title, one-line value proposition, and the search field, max-width container. **Role-gated "Add course" button** end-aligned in the band for users with course-authoring permission, linking to the course-creation surface — the exact pattern the blog listing already uses for "New article" (client-resolved on the ISR page, so visitors never see it and the page stays static).
- **Below the band:** a horizontal **specialty chip row** (from the `specialties` table: scrollable, single row, active chip filled-indigo). Specialties are Bosla's top-level mental model for a medical audience — they deserve first-class placement, not burial in a filter panel.
- **Featured rail:** when featured courses exist and no filters are active, a 3-column "Featured" section above the main grid — mirrors the blog's "Most popular" rail exactly. Hidden the moment any filter/search applies (results must feel authoritative).
- **Main grid:** responsive card grid — 1 column (phone) / 2 (tablet ≥ 640px) / 3 (desktop ≥ 1024px). No 4-column: medical course titles are long, and 3-up keeps cards readable in Arabic.

### Search
- The hero search field filters courses by title/subtitle/description, submit-on-enter (server round-trip, URL-driven — same as blog search). No autosuggest at launch (postponed; needs usage data to be good).
- Active search shows a "Results for '…'" heading with a clear-search affordance, replacing the featured rail.

### Filters
- **Desktop:** a slim filter row between chips and grid (not a sidebar — the catalog isn't big enough yet to justify losing a column): Category (dependent on selected specialty), Level, Language, Price (All / Free / Paid). Each is a compact select/popover.
- **Mobile:** one "Filters" button opening a **bottom sheet** with the same controls plus Apply/Reset. Active-filter count badges the button.
- All filter state lives in the URL (shareable, back-button friendly, ISR-cacheable) — this is already the existing catalog's architecture; keep it.

### Sorting
- Single sort select, end-aligned on the filter row: **Newest** (default), **Price: low→high**, **Price: high→low**, **Duration**. "Most popular" joins post-launch when enrollment counts are surfaced. No "Relevance" until real search ranking exists — honest UX means no placebo options.

### Pagination — recommendation: numbered pagination, not infinite scroll
- Numbered pagination (reusing the existing `CourseCatalogPagination` / blog pagination pattern). Reasons: (a) SEO — every page is a crawlable, cacheable ISR URL; (b) a purchase catalog needs *positional memory* — "it was on page 2" survives navigation to a details page and back, infinite scroll loses your place; (c) the footer stays reachable; (d) it's already built. Infinite scroll optimizes engagement-time metrics we don't sell to. Revisit only if the catalog exceeds ~15 pages.

### Loading & empty states
- **Route transition:** `BoslaPageLoader` (existing) covers navigation.
- **Filter/search transitions:** skeleton cards (thumbnail block + 2 text lines + meta line) in the grid, 6 of them, preserving grid dimensions so nothing jumps.
- **Empty results:** dashed-border panel (house pattern from blog): icon, "No courses match", one-line suggestion, and a Reset-filters button. **Empty catalog** (pre-launch state): same panel, "Courses are coming soon", link to the blog — never a dead end.

---

## 3. Course card

The card is the listing's atom and must answer, in under 3 seconds: *what, who, how deep, how long, how much.*

**Anatomy (top → bottom):**
1. **Thumbnail** — 16:9, `next/image` fill, gradient+icon placeholder when missing (existing pattern). Overlaid badges, top-start corner, stacking up to two: `Free` (green-tinted), `-30%` (accent), `Featured`, and post-launch `Bestseller`/`New` — priority order when more than two apply: discount/free first, then featured, then the rest. Level chip (`Beginner/Intermediate/Advanced`) sits bottom-start on the image, translucent surface.
2. **Category eyebrow** — small, muted, uppercase-tracking (matches blog card's category line).
3. **Title** — 2-line clamp, semibold.
4. **Instructor line** — avatar (24px) + name + qualification abbreviation (e.g. "PT, DPT"). Credentials on the card is a Bosla differentiator; Udemy hides them, we lead with them.
5. **Meta row** — muted icons+text: total duration (`4h 30m`), lesson count (`24 lessons`). Certificate icon if `certificateAvailable`.
6. **Price row** — current price emphasized; original price struck-through and muted *only when a real discount exists*. `Free` in green. **Rating slot:** reserved at the start of this row, empty until the reviews feature ships — the layout won't shift when it arrives.

**Enrolled state:** price row is replaced by the progress primitive (bar + `12/24 lessons`) and the whole card's CTA semantics become "Continue". A thin progress bar also underlines the thumbnail. `Completed` swaps the bar for a check + "Completed" in green.

**Hover (desktop):** shadow elevation + 1.03 image scale (existing house behavior), title color shifts to primary. Whole card is one link — no competing click targets inside.

**Responsive:** identical anatomy at all sizes; only grid columns change. On phones the card is full-width and the thumbnail dominates — that's correct, don't fight it with horizontal "list mode" variants (unnecessary complexity).

---

## 4. Course details page (`/courses/[slug]`)

The conversion page. Structure: **two-column on desktop (content 2/3 start, sticky purchase card 1/3 end), single column on mobile with a sticky bottom purchase bar.**

### Hero
- Full-width muted band (house pattern): breadcrumb (Specialty › Category), title (h1), subtitle, instructor line (avatar + name + credentials, linking to instructor section), meta strip (level · duration · lessons · language · last-updated). No cover image *in* the hero — the cover lives in the purchase card as the trailer poster. This keeps the hero text-first, fast, and calm (Coursera's lesson).

### Trailer / preview
- In the purchase card: cover image with a centered play button. Tapping swaps it in-place for the **Bosla Player** playing the trailer (`trailerVideoId`) — no modal on desktop or mobile; in-place keeps the purchase CTA visible while previewing. If no trailer, the cover renders alone.

### Purchase card (sticky sidebar, desktop)
Top → bottom: trailer/cover · price block (current, struck original + "% off" when a discount exists) · **deal countdown** when the course is under a time-limited promotion ("Offer ends in 2d 4h", live-ticking, driven by a real promotion end timestamp — see §10 schema decisions; the element simply doesn't render outside a promotion window) · primary CTA · "includes" checklist (duration, lessons, language, level, certificate if available, lifetime access) · guarantee/refund line (policy text, admin-editable).
**CTA states:**
- Visitor, paid course → `Buy course` → `/checkout/[slug]`
- Visitor, free course → `Enroll for free` (creates enrollment, straight to player)
- Signed-out → same labels; checkout/enroll flows through sign-in and returns
- Enrolled → `Continue learning` (deep-links to resume lesson) + progress primitive replacing the price block
- Sticky behavior: card sticks below the navbar as the page scrolls; it never overlaps the footer (stops at content end).

### Content column, in order
1. **What you'll learn** — `learningObjectives` as a 2-column check-mark grid (1-column mobile). This sits first: outcomes sell.
2. **Curriculum** — the curriculum tree in *marketing* mode: module accordions (first module open by default) with per-module lesson count + duration; lesson rows show title, duration, and either a lock icon or a `Preview` play affordance (`isPreview` lessons play in-place in a lightweight inline player row — the single most persuasive element on the page). Header summarizes: X modules · Y lessons · Z total hours.
3. **Requirements** — plain bulleted list (`requirements`).
4. **Description** — rich text (`description`), with a "Show more" clamp beyond ~400 words.
5. **Who this course is for** — bulleted (`targetAudience`).
6. **Instructor** — card with avatar, name, credentials/qualification, experience years, bio, and (post-launch) their other courses. Medical trust lives here; give it room.
7. **Reviews** — *designed slot, post-launch feature.* Reserve the section with heading order; until then the section simply doesn't render (no "no reviews yet" shame-state on a young platform).
8. **FAQ** — course-level FAQ accordion. *Post-launch* (needs a small schema addition); until then the global FAQ link suffices.
9. **Related courses** — 3 cards from the same category (fallback: specialty), reusing the course card verbatim.

### Mobile layout
- Single column: hero → trailer/cover (full-width, directly under hero) → **sticky bottom bar** (price + CTA, one row, safe-area padded; appears after scrolling past the inline CTA) → content sections in the same order.
- An **anchor tab row** (Overview · Curriculum · Instructor) sticks under the navbar on mobile, scroll-spying — long pages need a map on phones.

---

## 5. Student experience (post-purchase)

### The handoff (Onboard)
- Checkout success → straight into the player at Lesson 1, with a one-time welcome toast ("You're enrolled — let's start"). No interstitial "congratulations" page: momentum matters more than ceremony. The dashboard is discoverable later; the first experience is *learning*.

### Dashboard (`/dashboard`)
- **Continue learning hero:** the most recently touched course as a wide card — thumbnail, course identity block, progress primitive, "Resume: Lesson 12 — Gait Analysis" with the lesson title, and one primary button. Resume position comes from `lesson_progress` (+ `video_events` for in-lesson timestamp).
- **My courses grid:** enrolled-state course cards (progress variant), sorted by last activity. Filters: In progress / Completed / All — simple chip row.
- **Completed courses:** show the check state; when `certificateAvailable`, a `Certificate` affordance appears — at launch it opens a "certificates are coming" note *only if* certificates aren't built yet, in which case **hide the affordance entirely** (never ship a button that apologizes). The layout reserves the slot.
- **Empty state** (no enrollments): value-forward panel — "Your learning starts here" + 3 featured course cards inline. The empty dashboard is a storefront, not a void.

### Progress model (UX contract)
- A lesson is **complete** when: video ≥ ~90% watched (auto, existing behavior) or manually toggled (existing `LessonCompletionToggle`), or quiz passed for quiz lessons. Course progress = completed/total lessons. One rule, stated in the UI ("Marked complete automatically when you finish the video").
- **Certificate readiness:** at 100% with `certificateAvailable`, the course card and player both surface "Certificate ready" state. Actual generation/verification is a post-launch feature; the *states* are designed now so nothing reflows later.

### Future scalability (designed-for, not built)
Slots that this layout already accommodates: learning streaks strip on the dashboard, wishlists (heart on cards), notes recall ("your notes" per course), multi-course learning paths per specialty. None block launch; all have a reserved place.

---

## 6. Learning player (UX only — Bosla identity)

The player is Bosla's signature surface. Principle: **the lesson owns the screen; everything else is one gesture away.** (Bunny/HLS integration is explicitly out of scope here — this is the experience contract the streaming work will slot into.)

### Shell
- **Distraction-free chrome:** the player route drops the public navbar/footer. A slim top bar: exit affordance (back to course/dashboard, start side), course title (center-truncated), course progress primitive (end side). Nothing else. Dark-surface shell by default in both themes — video belongs on dark (Domestika's lesson); the content column below the video follows the user's theme.
- **Layout (desktop):** video area + below-video content (start, ~2/3) · curriculum sidebar (end, ~1/3, collapsible). Collapsing the sidebar (persisted preference) gives theater width — this *is* focus mode; no separate mode toggle.

### Video area
- Bosla Player (existing) with: play/pause, seek bar with buffered indication, elapsed/total, volume, playback speed (0.75–2×), captions toggle (slot — ties to phase-3 captions), fullscreen, and RTL-aware control order. Keyboard: space (play), ←/→ (±10s, direction-aware), ↑/↓ volume, F fullscreen, C captions, M mute.
- **On video end:** an in-player "Up next" card — next lesson title + thumbnail, 8-second auto-advance ring, Cancel. Autoplay-next is on by default, off switch persisted. Last lesson of the course → completion state instead (below).

### Curriculum sidebar (learning mode)
- Module accordions, current module open; lesson rows: status icon (done check / current playing-indicator / not-started dot / lock for quizzes not yet reachable if gating is ever enabled — default is free navigation), title, duration. Current lesson highlighted with the primary color's tinted background. Per-module progress fraction in the accordion header.
- Quizzes render as rows with a distinct icon; opening one swaps the video area for the existing `QuizPlayer`.

### Below the video
- **Tab row:** `Overview` (lesson `body` rich text) · `Resources` (downloadables — **launch-scoped; decision made:** a new lesson-attachments table will be added, see §10) · `Notes` (*post-launch; see §10*). Tabs that have no content don't render — a lesson with only video shows no tab row at all.
- **Completion:** the existing auto-complete + manual toggle, restyled as a single clear control near the lesson title ("Mark as complete" / "Completed ✓").

### Course completion moment
- Finishing the final lesson triggers the one celebratory moment in the product: an in-player completion panel — course identity block, 100% progress, "You completed the course", certificate state (if available), and two actions: back to dashboard / browse related courses. Confetti-free; premium restraint.

### Responsive
- **Tablet:** same as desktop; sidebar defaults collapsed in portrait.
- **Phone:** video pinned at top (16:9, full-width, safe-area aware), content scrolls beneath; curriculum becomes a **bottom drawer** summoned by a persistent "Lessons" pill (with progress fraction). Landscape phone = fullscreen video, native-feeling. Tab content stacks below video in portrait.

---

## 7. Design system extensions

Everything reuses the existing shadcn/token foundation; these are the deltas the Courses work must standardize:

- **Spacing:** stay on the Tailwind 4px scale already in use; section rhythm on public pages = the blog's (py-12 content blocks, mt-6 grids — expressed here as rhythm, not code). No new spacing values.
- **Typography:** existing ramp; course titles use the same weight/size as blog titles at equivalent hierarchy. Numbers (price, duration) use `tabular-nums`. Arabic gets the same ramp via IBM Plex Sans Arabic — audit line-heights with Arabic strings on every new component.
- **Cards:** one `Card` primitive family (existing); course card, dashboard variant, and related-course card are *the same component with props*, never three components.
- **Buttons:** existing button set. One primary CTA per viewport-screenful — the purchase card and sticky mobile bar never both show a filled CTA simultaneously.
- **Forms:** filters/search reuse existing form controls; the bottom-sheet filter panel is the one new form container (reusable for future faceted UIs).
- **Animations:** 150–250ms ease-out, transform/opacity only; the card hover scale, accordion expand, drawer/sheet slides, and the autoplay ring are the complete animation vocabulary. Everything honors `prefers-reduced-motion`.
- **Skeletons:** skeleton = layout-preserving gray blocks, used for *within-page* data transitions (filter results, dashboard grids); `BoslaPageLoader` remains the *route-level* loader. Never both at once.
- **Accessibility:** AA contrast in both themes (the muted-on-muted meta rows are the risk — audit); focus-visible rings on every interactive element; full keyboard operability of accordions, tabs, player, drawer; `aria-current` on the playing lesson; live-region announcements for completion events; all icon-only buttons labeled. RTL: every component reviewed in Arabic before sign-off, not after.
- **Dark mode:** semantic tokens only — zero raw colors in course surfaces; the player's dark shell uses tokens so it deepens gracefully in dark theme. Thumbnails get a subtle ring in dark mode (existing pattern) to hold card edges.

---

## 8. Mobile-first adaptation summary

| Surface | Phone | Tablet |
|---|---|---|
| Listing | 1-col grid; filters → bottom sheet; chips scroll horizontally | 2-col grid; inline filter row |
| Course card | Full-width, same anatomy | Same |
| Details | Single column; sticky bottom price/CTA bar; anchor tab row under navbar | Two-column from ≥1024px; sidebar card below hero before that |
| Checkout | Existing single column (fine) | Same, centered |
| Dashboard | Continue-hero stacks; 1-col grid | 2-col |
| Player | Pinned top video; "Lessons" pill → bottom drawer; landscape = fullscreen | Desktop layout, sidebar auto-collapsed in portrait |

Touch targets ≥ 44px throughout; sticky elements respect safe-area insets; the player's phone layout is the one to prototype first — it's the highest-risk responsive surface.

---

## 9. Competitive advantages (where Bosla visibly wins)

1. **True bilingual RTL learning.** None of the eight references does Arabic-first medical education with a properly mirrored player. This is structural, not cosmetic — and it's largely already built into Bosla's foundations.
2. **Honest commerce.** Urgency and merchandising, but real: countdowns tick against genuine promotion end times and disappear when the deal ends — never Udemy's perpetual 90%-off theater where the "deal" resets on every visit. Real prices, real deadlines. Trust is the product for a medical audience.
3. **Credentialed instruction.** Qualifications on the card, credentials in the hero, experience in the instructor section. Udemy's anonymity problem is our headline feature.
4. **Speed as a feature.** ISR pages, the optimized media pipeline (already shipped), one custom player instead of embedded iframes. Course pages should feel like the blog: instant.
5. **A player with an identity.** Bosla Player is ours — distraction-free, no "related courses from other creators" mid-lesson, no marketplace pulling attention away (the Kajabi insight, executed with marketplace-grade browsing).
6. **Specialty-native navigation.** Physiotherapy specialties as the primary browse axis matches how clinicians actually think, vs. generic "Health & Fitness" categories.

---

## 10. Decisions, hierarchy, roadmap

### Recommended user journey (canonical)
`/courses` → chip/filter → card → `/courses/[slug]` → preview lesson or trailer → CTA → (sign-in if needed) → `/checkout/[slug]` → success → `/courses/[slug]/learn/[first-lesson]` → learn, auto-advance, complete → dashboard → next course (related/featured).

### Page hierarchy
```
/courses                      listing (ISR, URL-driven filters)
/courses/[slug]               details (ISR; enrollment state client-resolved)
/courses/[slug]/learn         resolves to resume lesson → redirect
/courses/[slug]/learn/[lessonId]  player shell (auth + enrollment gated)
/checkout/[courseSlug]        existing
/dashboard                    student home
(course creation/editing = the existing instructor/admin course
 workspace; the listing's role-gated "Add course" button deep-links
 into it — no new authoring surface in this spec)
```

### Reusable component hierarchy (contracts to freeze first)
```
CourseIdentityBlock     (thumbnail · title · instructor · level) — 3 densities
ProgressPrimitive       (bar + fraction) — used by 4 surfaces
CurriculumTree          (marketing / learning / summary modes) — THE critical contract
CourseCard              (visitor / enrolled / completed states)
PriceBlock              (price · original · free · discount — the only place price renders)
PurchaseCard            (sidebar) / PurchaseBar (mobile) — same state machine
FilterSheet             (mobile bottom sheet, reusable)
SectionAccordion, AnchorTabs, EmptyPanel, SkeletonCard — house utilities
```

### Implementation roadmap (each phase = one Codex-delegated, reviewable slice)
1. **Foundations:** CurriculumTree contract, ProgressPrimitive, CourseIdentityBlock, PriceBlock + course card redesign. *(Everything else consumes these.)*
2. **Listing page** rebuild on the new card + chips + filter row/sheet + featured rail + role-gated "Add course" button (blog's "New article" pattern).
3. **Details page** rebuild: hero, purchase card/bar (incl. deal countdown + its promotion-window schema addition), curriculum marketing mode, preview playback, instructor section, related courses.
4. **Student layer:** dashboard (continue-hero, enrolled grids, states), enrollment-aware card/CTA states everywhere.
5. **Player UX upgrade:** shell, sidebar (learning mode of the same tree), tabs incl. Resources (+ lesson-attachments table), autoplay-next, completion moment, phone drawer layout.
6. **Post-launch features** (separate phases each): reviews/ratings, lesson resources, notes, certificates, course FAQ, wishlists, popularity sort — *in roughly that order of conversion impact.*

### Build first
Phase 1 + 2 (foundations + listing): highest reuse leverage, lowest risk, and the listing is the front door. The player (phase 5) goes last among launch phases deliberately — it already works today; its upgrade shouldn't block the funnel improving.

### Safely postponed until after launch
Reviews/ratings (no schema yet — the card and details page reserve slots), notes, certificates generation, course-level FAQ, wishlists, autosuggest search, popularity sorting, `Bestseller`/`New` badges (need enrollment/age data), learning streaks/gamification, learning paths.

### UX risks & pre-code architectural decisions
1. **CurriculumTree contract** — three surfaces consume it; changing its shape mid-build is the most expensive possible rework. Freeze its data contract (modules, lessons, durations, preview/lock/completion states) in phase 1. **DECIDED: no lesson gating — free navigation.** Lock states in the contract exist only for the marketing mode's not-enrolled rows.
2. **Lesson resources** — **DECIDED: a new lesson-attachments table will be added and the Resources tab ships with the player phase.** Files flow through the existing media pipeline (direct-to-storage uploads).
3. **Preview-lesson security** — `isPreview` playback on the details page must not leak non-preview video URLs; this couples to the signed-URL TODO and the Bunny work. Decide the gating model before phase 3 builds preview playback.
4. **Enrollment-state resolution on ISR pages** — details/listing pages are static; enrolled states resolve client-side (the blog already does this for author controls). Accept the brief "visitor → enrolled" swap on load; design CTA skeletons so it never flashes a wrong price.
5. **Currency** — **DECIDED: both EGP and USD supported; EGP is the default.** The PriceBlock renders per-course currency from the schema's existing `currency` column; new courses default to EGP. One currency per course — no runtime FX conversion (a rate-management problem this platform doesn't need).
6. **Promotion end times** — the approved deal countdown (§4) needs a real end timestamp; today the schema has `originalPrice` but no promotion window. **Schema addition before phase 3: a promotion window on courses (or a small promotions table) — `sale_ends_at` at minimum.** The countdown renders only inside a live window; expiring the window restores the base price automatically.
7. **Ratings absence** — competitors lead with stars; we launch without them. Mitigation is deliberate: credentials + curriculum transparency + previews carry trust until reviews exist. Don't fake it with testimonials styled as ratings.
8. **RTL in the player** — seek direction, control order, and drawer side must be validated with real Arabic users before freeze; this is the highest-risk RTL surface in the product.

---

*End of specification. Approve, amend, or strike sections — once frozen, implementation briefs reference this document by section number.*
