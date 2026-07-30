/**
 * The landing page's signature graphic — a precision compass rose, drawn
 * directly from the brand: "Bosla" (بوصلة) means "compass" in Arabic. Not
 * a stock illustration or a gradient blob: plain inline SVG (a few hundred
 * bytes, no image request), styled entirely from the existing design
 * tokens (`currentColor` + `text-primary`/`text-border` on the wrapper),
 * so it never needs its own color maintenance. The needle settles to its
 * resting angle via the same first-paint CSS animation convention as
 * `.hero-reveal` (globals.css) — zero JS, respects prefers-reduced-motion
 * automatically through that shared gating.
 */
export function CompassMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="100" cy="100" r="92" className="text-border" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="70" className="text-border" stroke="currentColor" strokeWidth="1" />

      {/* Cardinal + intermediate ticks */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i * 360) / 32;
        const isCardinal = i % 8 === 0;
        const isMajor = i % 4 === 0;
        const outer = 92;
        const inner = isCardinal ? 78 : isMajor ? 84 : 88;
        const rad = (angle * Math.PI) / 180;
        const x1 = 100 + outer * Math.sin(rad);
        const y1 = 100 - outer * Math.cos(rad);
        const x2 = 100 + inner * Math.sin(rad);
        const y2 = 100 - inner * Math.cos(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className="text-border"
            stroke="currentColor"
            strokeWidth={isCardinal ? 1.5 : 1}
          />
        );
      })}

      {/* Needle — settles to its resting angle on first paint */}
      <g className="compass-needle" style={{ transformOrigin: "100px 100px" }}>
        <path d="M100 30 L108 100 L100 108 L92 100 Z" className="text-primary" fill="currentColor" />
        <path d="M100 170 L108 100 L100 92 L92 100 Z" className="text-border" fill="currentColor" />
      </g>
      <circle cx="100" cy="100" r="5" className="text-primary" fill="currentColor" />
    </svg>
  );
}
