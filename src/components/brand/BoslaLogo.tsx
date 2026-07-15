import { MARK_HEAD, MARK_RING, MARK_TICKS, MARK_VERTEBRAE } from "@/components/brand/bosla-mark";

/**
 * The full Bosla mark — compass bezel + needle-spine. `variant="solid"`
 * is the primary lockup (filled needle on the brand color via
 * `currentColor`); `variant="outline"` is the stroke-only form the
 * watermark builds on. Size via `className` (`size-8`, `size-12`, …),
 * color via text utilities — the SVG is entirely `currentColor`.
 */
export function BoslaLogo({
  variant = "solid",
  className,
  title = "Bosla",
}: {
  variant?: "solid" | "outline";
  className?: string;
  title?: string;
}) {
  const outline = variant === "outline";
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={className}>
      <circle
        {...MARK_RING}
        fill="none"
        stroke="currentColor"
        strokeWidth={outline ? 2.5 : 3.5}
        opacity={outline ? 0.9 : 1}
      />
      {MARK_TICKS.map((d) => (
        <path key={d} d={d} stroke="currentColor" strokeWidth={2} strokeLinecap="round" opacity={0.55} />
      ))}
      <path
        d={MARK_HEAD}
        fill={outline ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth={outline ? 2.5 : 0}
        strokeLinejoin="round"
      />
      {MARK_VERTEBRAE.map((d, index) => (
        <path
          key={d}
          d={d}
          fill={outline ? "none" : "currentColor"}
          stroke="currentColor"
          strokeWidth={outline ? 2.5 : 0}
          strokeLinejoin="round"
          opacity={outline ? 1 : 1 - index * 0.18}
        />
      ))}
    </svg>
  );
}
