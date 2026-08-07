"use client";

import { useEffect, useState } from "react";

export interface TypewriterSegment {
  text: string;
  /** Renders this run's words in `text-primary` (the one highlighted
   *  word/phrase a headline picks out). */
  highlighted?: boolean;
}

interface TypedWord {
  word: string;
  highlighted: boolean;
  /** False for a word that butts directly against whatever follows with
   *  no space in the source string (e.g. a highlighted word immediately
   *  followed by a "." suffix) — suppresses that one word's trailing
   *  gap so "valuable." doesn't render with a stray space before the
   *  period. Derived from whether *this word's own segment* ends with
   *  whitespace, not just "is this the DOM-last word" (which fires for
   *  the wrong word: the suffix segment's word, not the one that should
   *  lose its margin). */
  marginAfter: boolean;
}

/** Flattens prefix/highlight/suffix segments into per-word reveal units.
 *  Word-level, never character-level: Arabic script shapes letters
 *  contextually (initial/medial/final forms) based on neighbors in the
 *  same text run, so splitting mid-word breaks that shaping outright —
 *  confirmed visually in this project before, not a theoretical
 *  concern. Keeping every word's characters in one run avoids it, in
 *  both scripts, while still giving a real typewriter reveal. This also
 *  happens to be what makes wrapping safe: unlike a whole-line
 *  character-clip reveal (which needs `white-space: nowrap` and breaks
 *  on any sentence long enough to wrap on a narrow screen), independent
 *  word spans wrap exactly like normal text. */
function wordsFromSegments(segments: TypewriterSegment[]): TypedWord[] {
  const out: TypedWord[] = [];
  segments.forEach((seg) => {
    const words = seg.text.split(" ").filter((w) => w.length > 0);
    const segmentEndsWithSpace = /\s$/.test(seg.text);
    words.forEach((word, i) => {
      const isLastOfSegment = i === words.length - 1;
      out.push({
        word,
        highlighted: !!seg.highlighted,
        marginAfter: !isLastOfSegment || segmentEndsWithSpace,
      });
    });
  });
  if (out.length > 0) out[out.length - 1].marginAfter = false;
  return out;
}

/**
 * A single typed line, revealed word-by-word via a plain CSS class
 * toggle (`.is-revealed`, driving a `display:none → inline-block` +
 * fade-in) instead of a GSAP timeline — no refs to position, no pixel
 * math, no RTL-specific offset logic. Every word is always in the DOM
 * (SSR- and no-JS-safe: `.bosla-typed-word`'s *default* CSS state is
 * fully visible — see globals.css — hidden only once JS confirms motion
 * is allowed), so a not-yet-typed word is invisible *and out of normal
 * flow* rather than just transparent. That's what lets the blinking
 * cursor — this line's own trailing child — always land right after
 * the last word that's actually appeared with zero position math:
 * normal inline flow (and the browser's own `direction` handling) puts
 * it in the right place in both scripts, and the line wraps exactly
 * like normal text if it needs to.
 *
 * Multi-segment lines (prefix + highlighted word + suffix) are just a
 * longer flattened word list — a differently-highlighted word in the
 * middle of a sentence isn't a special case here.
 */
export function TypewriterLine({
  as = "p",
  className,
  segments,
  /** This line's turn has arrived — starts revealing its first word. */
  active,
  /** Called once this line's last word finishes revealing. */
  onDone,
  /** Whether the blinking cursor currently belongs to this line — driven
   *  by the parent's sequencing, since only one line owns it at a time. */
  showCursor,
  srText,
  /** Bump this (any new value) to make an already-typed line forget it
   *  ever typed and start over from its first word — the closing Finale
   *  re-plays its whole sequence every time it's scrolled back into
   *  view, unlike the Hero, which only ever types once. Stable across
   *  renders (e.g. omitted, or a constant) means "never reset". */
  resetKey,
}: {
  as?: "p" | "h1" | "h2";
  className: string;
  segments: TypewriterSegment[];
  active: boolean;
  onDone: () => void;
  showCursor: boolean;
  srText: string;
  resetKey?: string | number;
}) {
  const Tag = as as React.ElementType;
  const words = wordsFromSegments(segments);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    setRevealedCount(0);
  }, [resetKey]);

  useEffect(() => {
    if (active && revealedCount === 0 && words.length > 0) setRevealedCount(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function handleWordDone(index: number) {
    if (index + 1 < words.length) {
      setRevealedCount(index + 2);
    } else {
      onDone();
    }
  }

  return (
    <Tag className={`relative ${className}`}>
      <span className="sr-only">{srText}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span
            key={i}
            className={`bosla-typed-word ${i < revealedCount ? "is-revealed" : ""} ${w.marginAfter ? "me-[0.28em]" : ""} ${w.highlighted ? "text-primary" : ""}`}
            onAnimationEnd={(e) => {
              if (e.animationName === "bosla-word-in") handleWordDone(i);
            }}
          >
            {w.word}
          </span>
        ))}
        {showCursor && <span className="blink-cursor" />}
      </span>
    </Tag>
  );
}
