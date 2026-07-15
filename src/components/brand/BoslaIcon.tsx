import { MARK_HEAD, MARK_VERTEBRAE } from "@/components/brand/bosla-mark";

/**
 * The compact mark — arrowhead + three vertebrae, no bezel. This is the
 * app-icon/favicon form: at small sizes the ring turns to mud, but the
 * needle-spine silhouette stays legible down to 16px. Same
 * `currentColor` contract as `BoslaLogo`.
 */
export function BoslaIcon({ className, title = "Bosla" }: { className?: string; title?: string }) {
  return (
    // Tight crop around the needle group (x 18–46 of the 64-canvas),
    // so the icon fills its box instead of floating in bezel padding.
    <svg viewBox="16 2 32 56" role="img" aria-label={title} className={className}>
      <path d={MARK_HEAD} fill="currentColor" strokeLinejoin="round" />
      {MARK_VERTEBRAE.map((d, index) => (
        <path key={d} d={d} fill="currentColor" opacity={1 - index * 0.18} />
      ))}
    </svg>
  );
}
