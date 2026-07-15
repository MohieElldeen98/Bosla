import { MARK_HEAD, MARK_RING, MARK_TICKS, MARK_VERTEBRAE } from "@/components/brand/bosla-mark";
import { cn } from "@/lib/utils";

/**
 * The brand loading animation, telling the mark's story on loop: the
 * needle head spins searching for north (with a compass-like overshoot
 * settle), and as it locks in, the three vertebrae fade in down its tail
 * — orientation first, then the spine. Keyframes live in `globals.css`
 * (`bosla-loader-*`); everything is `currentColor`.
 */
export function BoslaLoader({
  className,
  label,
  ring = "subtle",
}: {
  className?: string;
  label?: string;
  /** `subtle` recedes behind the animation (loading overlays);
   *  `strong` matches `BoslaLogo`'s full bezel — the navbar/footer's
   *  animated logo form. */
  ring?: "subtle" | "strong";
}) {
  const strong = ring === "strong";
  return (
    <svg
      viewBox="0 0 64 64"
      role="status"
      aria-label={label}
      className={cn("bosla-loader", className)}
    >
      <circle
        {...MARK_RING}
        fill="none"
        stroke="currentColor"
        strokeWidth={strong ? 3.5 : 3}
        opacity={strong ? 1 : 0.25}
      />
      {MARK_TICKS.map((d) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={strong ? 0.55 : 0.35}
        />
      ))}
      <path d={MARK_HEAD} fill="currentColor" className="bosla-loader-needle" />
      {MARK_VERTEBRAE.map((d, index) => (
        <path
          key={d}
          d={d}
          fill="currentColor"
          className={`bosla-loader-vertebra bosla-loader-vertebra-${index + 1}`}
        />
      ))}
    </svg>
  );
}
