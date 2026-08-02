import type { ReactNode, Ref } from "react";

/** One `<span>` per *word*, tagged with `lineClass` so GSAP can select
 *  and stagger an entire line's words at once, plus `text-primary` for
 *  a highlighted run. Deliberately word-level, not character-level:
 *  Arabic script shapes letters contextually (initial/medial/final
 *  forms) based on their neighbors in the same text run — splitting
 *  into per-character spans breaks that shaping outright, confirmed
 *  visually (Arabic rendered as disconnected, misordered glyphs, not a
 *  theoretical concern). Word-level splitting keeps every word's
 *  characters in one run so shaping stays correct in both scripts,
 *  while still giving a real typewriter reveal.
 *
 *  Inter-word spacing is a CSS margin, not a literal space character —
 *  a space is what actually looked like a "space" the first two times
 *  this was tried and wasn't (either the text-content approach
 *  collapsed to zero width, or the char-split approach broke Arabic
 *  shaping); margin never has either problem.
 *
 *  Real DOM text throughout (never innerHTML string-building) — a
 *  screen reader with JS off just reads the sentence; GSAP staggers
 *  each word span's opacity to fake the typing. Shared by the Hero and
 *  the closing Finale — both use the same mechanic, at different
 *  paces. */
export function splitWords(
  text: string,
  keyPrefix: string,
  lineClass: string,
  highlighted = false,
  /** True when this segment's last word butts directly against the next
   *  segment with no space in the source string (e.g. a highlighted word
   *  immediately followed by a "." suffix) — suppresses that one word's
   *  trailing margin so "valuable ." doesn't render with a stray gap
   *  before the period. `last:me-0` alone can't catch this: it only
   *  fires for the true DOM-last child, and this word usually isn't it —
   *  the suffix segment's word is. */
  suppressTrailingSpace = false,
) {
  const highlightClass = highlighted ? "text-primary" : "";
  const words = text.split(" ").filter((word) => word.length > 0);

  return words.map((word, i) => {
    const isLast = i === words.length - 1;
    const spacingClass = isLast && suppressTrailingSpace ? "" : "me-[0.28em] last:me-0";
    return (
      <span key={`${keyPrefix}-${i}`} className={`${lineClass} inline-block ${spacingClass} ${highlightClass}`}>
        {word}
      </span>
    );
  }) as ReactNode[];
}

/** The blinking bar cursor. Hidden by default (see `.blink-cursor` in
 *  globals.css) — GSAP only ever toggles the `is-active` class, never
 *  opacity directly, so the CSS blink animation and GSAP's own
 *  transforms never fight over the same property. */
export function TypewriterCursor({ cursorRef }: { cursorRef: Ref<HTMLSpanElement> }) {
  return (
    <span
      ref={cursorRef}
      className="blink-cursor ms-1 inline-block h-[0.9em] w-[3px] translate-y-[0.12em] bg-foreground"
    />
  );
}
