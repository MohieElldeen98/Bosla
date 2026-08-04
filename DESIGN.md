---
name: Bosla
description: Bilingual (Arabic/English) educational marketplace for healthcare professionals — a compass guiding clinicians from confusion to confidence
colors:
  compass-indigo: "oklch(0.478 0.192 265.5)"
  ivory: "oklch(0.985 0 0)"
  pale-indigo-mist: "oklch(0.962 0.008 265.5)"
  slate-indigo: "oklch(0.5 0.022 265.5)"
  soft-indigo-tint: "oklch(0.94 0.03 265.5)"
  deep-indigo-tint: "oklch(0.33 0.13 265.5)"
  compass-brass: "oklch(0.55 0.12 70)"
  signal-red: "oklch(0.577 0.245 27.325)"
  daybreak-white: "oklch(0.995 0.002 265.5)"
  ink-indigo: "oklch(0.16 0.015 265.5)"
  hairline-indigo: "oklch(0.912 0.012 265.5)"
  paper-white: "oklch(1 0 0)"
typography:
  body:
    fontFamily: "IBM Plex Sans, IBM Plex Sans Arabic, sans-serif"
    fontWeight: 400
  article:
    fontFamily: "IBM Plex Sans Arabic, IBM Plex Sans, sans-serif"
    fontSize: "1.0625rem"
    lineHeight: 1.8
  accent:
    fontFamily: "Marhey, sans-serif"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  3xl: "22px"
  4xl: "26px"
spacing:
  card-default: "16px"
  card-sm: "12px"
components:
  button-primary:
    backgroundColor: "{colors.compass-indigo}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
  button-primary-hover:
    backgroundColor: "color-mix(in oklch, {colors.compass-indigo} 80%, transparent)"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-indigo}"
    rounded: "{rounded.lg}"
  card:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "transparent"
    rounded: "{rounded.lg}"
    height: "32px"
  badge-default:
    backgroundColor: "{colors.compass-indigo}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.4xl}"
---

# Design System: Bosla

## Overview

**Creative North Star: "From Confusion to Confidence"**

This isn't a separate invented aesthetic layered on top of the product — it's the story the homepage already tells, beat by beat: Problem (Confusion) → Bosla Exists (Direction) → Specialization → Learning Journey (Confidence) → Vision → Finale → Final CTA (Action). The visual system's job is to carry that arc, not decorate it. One motif does this work throughout: a compass finding true north — literally, in the compass-rose mark, the loader's seeking-then-settling needle, and the progress bar's arrowhead sliding along a track; figuratively, in a night-sky hero gradient (deep indigo/violet rising to cyan) that reads as searching for daylight, and in the Learning Journey section's hand-drawn "spine" that ties the path metaphor to real page structure instead of a stock icon.

Restraint is used deliberately as a storytelling beat, not just an aesthetic default: the Problem section is intentionally the *only* restless, cluttered moment on the page (fragments drifting at uneven speeds, deliberately non-monotonic, to feel like scattered noise); Bosla Exists is the first section that holds still on purpose, since after the clutter, stillness itself is the signal that the page has landed somewhere solid; Vision and Final CTA are the plainest, most whitespace-heavy sections on the page, because the brief for both is explicit — the visitor should feel ready, not rushed, and no countdown/urgency/exclamation-mark language is allowed there.

The neutral palette is never truly gray — every core token (background, foreground, borders, muted surfaces) carries the same indigo hue (265.5) as the brand primary, so a plain page of cards and text still feels mixed on Bosla's own palette rather than left at a framework default.

**Key Characteristics:**
- One continuous wayfinding/compass motif carried through motion (loader, progress bar) and imagery (hero gradient, night sky), not repeated as decoration
- Deliberate contrast between "restless" and "still" sections as a narrative device — motion itself tells part of the story
- A warm brass accent (`compass-brass`) reserved strictly for earned/urgent commercial moments (discounts, deal countdowns) — indigo stays the only interactive color
- Indigo-tinted neutrals throughout instead of true gray
- One shared typographic voice (IBM Plex Sans / IBM Plex Sans Arabic) across both scripts, so Arabic is never a lesser-considered translation of an English-first design

## Colors

The palette is authored in OKLCH and is almost monochromatic by design: nearly every token shares hue 265.5 (a confident, slightly violet-leaning blue/indigo), with only two deliberate exceptions — the brass achievement accent and destructive red.

### Primary
- **Compass Indigo** (`oklch(0.478 0.192 265.5)` / `#284fc7`): the brand's one interactive color — logo, primary buttons, links, focus rings, active states. Also used as the site's cursor fill (a compass needle arrowhead, replacing the default pointer).

### Neutral
- **Daybreak White** (`oklch(0.995 0.002 265.5)` / `#fdfdff`): page background. Not pure white — the faint indigo bias is intentional.
- **Ink Indigo** (`oklch(0.16 0.015 265.5)` / `#0a0d14`): body text. Not pure black, same bias.
- **Paper White** (`oklch(1 0 0)` / `#ffffff`): card and popover surfaces — the one truly neutral white in the system, reserved for surfaces that need to sit above the tinted background.
- **Pale Indigo Mist** (`oklch(0.962 0.008 265.5)` / `#f0f2f8`): secondary/muted surface backgrounds.
- **Slate Indigo** (`oklch(0.5 0.022 265.5)` / `#5d6370`): secondary/descriptive text (captions, metadata).
- **Hairline Indigo** (`oklch(0.912 0.012 265.5)` / `#dee2ea`): borders, dividers, input strokes.
- **Soft Indigo Tint** (`oklch(0.94 0.03 265.5)` / `#e2ebff`) with **Deep Indigo Tint** text (`oklch(0.33 0.13 265.5)` / `#142d77`): pale hover/selected backgrounds — a lighter step than Compass Indigo, never the brand color itself.

### Achievement (earned moments only)
- **Compass Brass** (`oklch(0.55 0.12 70)` / `#9d6300`): the one hue that breaks from indigo on purpose. Used exclusively for discount labels and deal countdowns (`PriceBlock`, `DealCountdown`) — commercial urgency, not general decoration.

### Signal
- **Signal Red** (`oklch(0.577 0.245 27.325)` / `#e7000b`): destructive actions, form errors, validation states.

### Named Rules
**The One Interactive Color Rule.** Compass Indigo is the only color that means "click me" or "focused." Compass Brass marks value/urgency, never interactivity. Any other hue appearing in the UI (the rich-text callout variants — green/red/amber/violet — being the sole sanctioned exception) should be treated as a bug, not a new accent.

**The Tinted Neutral Rule.** Never introduce a pure zero-chroma gray. Every neutral surface, border, or muted text color carries hue 265.5, however faint.

## Typography

**Body Font:** IBM Plex Sans (Latin) / IBM Plex Sans Arabic (Arabic) — loaded as matched instances under one `--font-sans` variable, same weights (400/500/600/700), so neither script is the "primary" and the other a fallback.
**Article Font:** IBM Plex Sans Arabic, loaded on *both* locales specifically for rich-text article bodies (`.rich-text-content`), so an Arabic article never falls back to a different Arabic face than the rest of the reading experience.
**Accent Font:** Marhey — a handwritten/marker display face covering Arabic and Latin, used sparingly for one-off accent lines (e.g. a "share this article" prompt), never for headings or body copy.

**Character:** Plex's technical-humanist voice reads as precise but approachable — closer to a clinical instrument's dial than a corporate sans — which is why it carries both the marketing site and dense article content.

### Hierarchy
- **Body** (400, `1rem`/`14px` depending on context, `sans-serif` stack): default UI and copy weight.
- **Article body** (400, `1.0625rem`, `1.8` line-height): the one place with a fixed global size — long-form reading needs more breathing room than UI chrome.
- **Headings**: same Plex family at heavier weights (500–700), sized per-section rather than off one fixed global scale — the homepage's story sections each choreograph their own type scale and reveal timing (see Layout).
- **Accent** (Marhey, 400/700): reserved for the rare handwritten-style aside; never a hierarchy level of its own.

### Named Rules
**The Shared-Voice Rule.** Latin and Arabic never diverge in typographic character — same family, same weights, same rhythm. A translated page should feel like the same design, not an adapted one.

## Layout

The homepage is a single-page, scroll-driven narrative (GSAP + ScrollTrigger), not a stack of generic marketing sections. Each section ("stage") owns its own motion vocabulary and pacing, chosen to match its place in the story rather than a shared template:

- **Hero**: word-by-word typewriter reveal (0.11s/word, matching Finale's pace). The "Welcome." line holds on its own for a beat (1.3s) before the headline starts, so it registers as a greeting first, not a preamble to what follows. Sits on a dark, indigo "night-sky" atmosphere — a soft animated glow behind the compass mark plus a drifting nebula texture, both scoped with a local `.dark` class so they reuse the product's own dark-mode tokens instead of new colors. The compass motif's "searching for daylight" language above is literal here, not just descriptive.
- **Problem**: four text fragments drift upward at deliberately uneven speeds and horizontal offsets (non-monotonic on purpose) so it reads as scattered clutter, not a tidy staircase. Continues the Hero's dark atmosphere through the clutter, then eases into daylight over the section's final stretch — timed so the shift lands right as the resolution line commits and holds, the same beat resolving both the thought and the color.
- **Bosla Exists**: the only section with zero continuous or scrubbed motion — one settle-and-hold, on purpose, as the "we've landed somewhere solid" beat after Problem's restlessness. Start-aligned rather than centered, deliberately breaking the Hero/Vision centered-layout callback so the page doesn't read as one template repeated three times. Plain daylight background — the discrete cut from Problem's dark atmosphere is deliberate, not a gradual blend.
- **Specialization**: a pinned scroll-driven slide sequence (~550px of scroll per timeline unit); slides never move on the `x` axis, only depth/tilt, so the direction change reads as "the same motion, reversed," not two unrelated effects.
- **Learning Journey**: one flowing column of short beats (no cards, no icon grid), with a single drawn "spine" along the start edge as the page's literal path metaphor.
- **Vision**: the shortest, plainest section — one settle-in reveal, no scrub, no pin, no decoration. Whitespace does all the work.
- **Finale**: an ~11s word-by-word typewriter climax (0.11s/word, unhurried on purpose), pinned for roughly 2600px of scroll (~3 viewport heights) — enough that a normal-paced scroller doesn't outrun the sequence, without leaving excessive dead scroll once it finishes.
- **Final CTA**: the quietest section on the page — maximum whitespace, one line, one button, one calm reveal. No urgency language of any kind.

Every scroll/motion effect is gated behind `prefers-reduced-motion: no-preference`; with it set, every section renders fully visible at rest from first paint — nothing is ever hidden waiting on JS.

### Named Rules
**The One Restless Section Rule.** Only Problem is allowed to feel chaotic. Every other section either holds still or moves once, deliberately — motion is a story beat, not ambient texture.

## Elevation & Depth

Mostly flat, tonal design — the system leans on the indigo-tinted neutral scale for separation rather than heavy shadows. Where shadows do appear (card elevation), they're hue-matched to the brand rather than generic gray, paired with a hairline ring for edge legibility on the tinted background.

### Shadow Vocabulary
- **Card (resting)** (`0 1px 2px oklch(0.32 0.06 265.5 / 0.05), 0 8px 24px -12px oklch(0.32 0.09 265.5 / 0.14)`): default card elevation, paired with `ring-1 ring-foreground/5`.
- **Card (hover)** (`0 2px 4px oklch(0.32 0.06 265.5 / 0.07), 0 16px 40px -12px oklch(0.32 0.1 265.5 / 0.22)`): hover/lift state, same hue family, larger and darker.

### Named Rules
**The Indigo Shadow Rule.** Any shadow in the system is mixed from the brand hue (265.5), never a flat black/gray — elevated surfaces should look lit by Bosla's own light.

## Shapes

Corners are generous and consistent, scaled off one base radius (`--radius: 0.625rem` / 10px) rather than picked per component: `sm` 6px, `md` 8px, `lg` 10px (the default for buttons, inputs, most surfaces), `xl` 14px (cards), up to `4xl` 26px (fully pill-shaped badges/chips). Borders are hairline and low-contrast (`hairline-indigo`); the system prefers a soft shadow + hairline ring combination over a hard border for surfaces that need separation without looking boxed-in.

## Components

### Buttons
- **Shape:** rounded-lg (10px) at default size; smaller sizes step down proportionally.
- **Primary:** Compass Indigo background, Ivory text; hover drops to 80% opacity rather than a different shade.
- **Secondary:** Pale Indigo Mist background, dark indigo text.
- **Outline:** transparent background, hairline border, fills with Pale Indigo Mist on hover.
- **Ghost:** no border or fill at rest; Pale Indigo Mist on hover.
- **Destructive:** Signal Red at low opacity (10%) rather than a solid fill — errors are present but not alarming.
- **Link:** Compass Indigo text, underline on hover only.
- All variants: a subtle 1px downward press (`translate-y-px`) on active, a 3px focus ring at 50% opacity — no scale transforms.

### Cards
- **Corner Style:** rounded-xl (14px).
- **Background:** Paper White (the one true neutral surface), not the tinted background.
- **Shadow Strategy:** see Elevation & Depth — resting shadow + `ring-1 ring-foreground/5` hairline, never a hard border alone.
- **Internal Padding:** 16px default, 12px in the compact (`sm`) size variant.

### Inputs / Fields
- **Style:** hairline border, transparent background, rounded-lg (10px), 32px height at default size.
- **Focus:** border shifts to the ring color plus a 3px ring at 50% opacity — same focus language as buttons.
- **Error:** border and ring shift to Signal Red.

### Badges / Chips
- **Style:** fully pill-shaped (rounded-4xl, 26px), compact (20px tall). Default variant uses the solid Compass Indigo fill; secondary/outline/ghost/destructive mirror the button variants' logic at smaller scale.

### Navbar
The site's global chrome (`src/components/layout/navbar.tsx`, every route except the player) is a floating glass-pill bar — inset from the viewport rather than a full-width strip — not a traditional flush header. It's adaptive, not fixed-light: whichever `section.dark`-scoped section (the Hero/Problem night-sky atmosphere) currently sits behind the bar's midpoint flips the bar into `.dark` too, reusing the exact token-scoping technique those sections already use, so it reads correctly over both the dark story-opening and the daylight sections. Shape and height stay constant across scroll states (only glass opacity, blur, and shadow intensify) — this is calm, reliable Operate-mode chrome on courses/blog pages too, not just homepage theater — and it recedes on sustained scroll-down, returning on scroll-up or on keyboard focus, so it never competes with content but is never more than one gesture away.

The glass material itself (`.nav-glass` in `globals.css`) is a **deliberate, user-directed exception to the Tinted Neutral Rule**: true grays (`rgb()`, not `--background`) rather than hue-265.5-tinted ones, because real glass reads as glass by being colorless and letting whatever's behind it show through blurred/refracted — a colored tint would read as a solid panel instead. Compass Indigo stays the only accent (the sliding indicator, buttons, brand mark); a bright inset top edge plus a soft dark bottom edge (the specular highlight) sells "glass" independent of light/dark mode. In Chromium, an inline `feTurbulence`+`feDisplacementMap` SVG filter (`#nav-liquid-glass`) is layered in via `backdrop-filter: url(#id)` behind an `@supports` gate for genuine per-pixel refraction, not just a blurred tint; Safari/Firefox (this app targets Safari 15+, see CLAUDE.md) get the same material minus the distortion, which is a complete design on its own, not a degraded one.

Its one authored motion moment is a sliding indicator that glides to whatever nav item is hovered or focused and springs back to the current route on release — see Motion Family below, this is that family's fourth member. Desktop links additionally carry a restrained magnetic pull toward the cursor (mouse and motion-allowed only). Mobile has no hamburger or side drawer: primary links are compact icons in the same pill, and a "more" trigger (the user's own avatar when signed in) opens a bottom sheet for secondary items (auth, language, notifications) — deliberately not a fixed-bottom dock, since `MobilePurchaseBar` already owns that edge on course detail pages.

### Signature Component: Compass Mark & Motion Family
The homepage's signature graphic is a compass rose, drawn as plain inline SVG (no image request), styled entirely from existing tokens (`currentColor` + `text-primary`/`text-border`) so it never needs independent color maintenance. The same needle-seeking-then-settling motion vocabulary repeats across four brand components — `BoslaLoader` (a spinning needle overshoots and settles, with three "vertebrae" fading in along its tail on one shared 2.8s timeline), `BoslaProgress` (an arrowhead glides along a track for indeterminate states, or sits at a literal width/position for determinate ones), the homepage's own `CompassMark` (settles from a searching angle to true north once on first paint), and the global `Navbar`'s sliding active/hover indicator (glides to a nav item and overshoots slightly before settling) — so "finding direction" is a motion signature, not a one-off animation.

## Do's and Don'ts

### Do:
- **Do** keep Compass Indigo as the only color that signals interactivity anywhere in the product.
- **Do** carry the indigo hue bias (265.5) into every neutral, even ones that read as "just gray" at a glance.
- **Do** gate every non-essential animation behind `prefers-reduced-motion: no-preference`, with a fully visible, fully static fallback — never a hidden-until-JS-runs state.
- **Do** give Arabic and Latin type identical weight, size, and rhythm treatment — no "translated afterthought" styling.
- **Do** reserve Compass Brass strictly for pricing/deal/earned-status moments.

### Don't:
- **Don't** add urgency language (countdowns, "limited spots," exclamation marks) to calm sections like Vision or Final CTA — restraint there is a deliberate brief, not an oversight to fix.
- **Don't** introduce a second interactive color alongside Compass Indigo, or a decorative use of Compass Brass outside pricing/deal contexts.
- **Don't** use a pure zero-chroma gray anywhere; every neutral must carry the brand hue.
- **Don't** make the Problem section's clutter a repeated pattern elsewhere — its chaos is the point precisely because every other section is calmer than it.
- **Don't** reach for a stock icon or illustration for the compass/wayfinding motif — the system's own inline `CompassMark` SVG and its motion family exist specifically so this never needs outside imagery.
