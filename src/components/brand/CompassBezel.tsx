/**
 * The brand's signature motif: a compass bezel — Bosla (بوصلة) means
 * compass, and the cursor is already the needle (see globals.css); this
 * is the instrument the needle lives in. Two concentric rings, degree
 * ticks every 6° (majors at the cardinals), one meridian line. Drawn in
 * `currentColor` at whatever opacity the call site sets, so it works on
 * any surface and both themes without its own palette. Decorative only —
 * always `aria-hidden`, always behind content, never interactive.
 */
export function CompassBezel({ className }: { className?: string }) {
  const ticks = Array.from({ length: 60 }, (_, index) => {
    const angle = (index * 6 * Math.PI) / 180;
    const isCardinal = index % 15 === 0;
    const outer = 96;
    const inner = isCardinal ? 84 : 90;
    return {
      key: index,
      x1: 100 + outer * Math.sin(angle),
      y1: 100 - outer * Math.cos(angle),
      x2: 100 + inner * Math.sin(angle),
      y2: 100 - inner * Math.cos(angle),
      width: isCardinal ? 2 : 1,
    };
  });

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="100" cy="100" r="3" fill="currentColor" />
      <line x1="100" y1="28" x2="100" y2="172" stroke="currentColor" strokeWidth="0.5" />
      {ticks.map((tick) => (
        <line
          key={tick.key}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke="currentColor"
          strokeWidth={tick.width}
        />
      ))}
    </svg>
  );
}
