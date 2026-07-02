import type { LocalizedText } from "@/types/i18n";

/**
 * Semantically distinct from `LocalizedText`: a field tagged with this type
 * renders as formatted (markdown) text rather than a plain string — e.g. a
 * FAQ answer. No renderer exists yet (no Admin UI, no markdown-to-HTML step
 * this step) — this is the type-level marker a future editor/renderer
 * keys off, so adding rich-text rendering later is additive, not a
 * content-shape migration.
 */
export type LocalizedRichText = LocalizedText;

/** A labeled link — a nav item, a CTA button, a footer link. One shape,
 *  reused everywhere a "button or link" is needed (see docs/cms-overview.md
 *  §1's "images, icons, links, buttons" requirement). */
export interface CmsLink {
  label: LocalizedText;
  href: string;
}

/**
 * An icon field is always a string *key* (e.g. `"stethoscope"`), resolved
 * to a component through a lookup map at render time — the same "name, not
 * component" convention `src/lib/hero-icons.ts`/`src/lib/course-category.ts`
 * already use, so CMS content stays plain JSON, never a component
 * reference.
 */
export type CmsIconKey = string;
