import { cn } from "@/lib/utils";

/**
 * The logged-in hub's signature graphic — a fifth member of the Compass
 * Mark & Motion Family (DESIGN.md): same rings/ticks/needle grammar as
 * `CompassMark`, but the needle settles on a real per-visitor reading
 * (course progress, course counts, pending applications) instead of
 * always finding true north. A 240° open-bottom sweep (classic gauge
 * shape, not a full circle) keeps it legible as an instrument rather
 * than a second compass. `value` is a 0-1 fraction; the needle and the
 * arc fill both settle to it via `.instrument-dial-needle` /
 * `.instrument-dial-fill` (globals.css) on first paint, gated behind
 * prefers-reduced-motion the same way every other first-paint moment
 * on this site is.
 */

const ARC_START = -120;
const ARC_SWEEP = 240;

function polarPoint(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 100 + radius * Math.sin(rad),
    y: 100 - radius * Math.cos(rad),
  };
}

const TRACK_START = polarPoint(ARC_START, 82);
const TRACK_END = polarPoint(ARC_START + ARC_SWEEP, 82);
const TRACK_PATH = `M ${TRACK_START.x} ${TRACK_START.y} A 82 82 0 1 1 ${TRACK_END.x} ${TRACK_END.y}`;

const TICK_ANGLES = [-120, -90, -60, -30, 0, 30, 60, 90, 120];

export function InstrumentDial({
  value,
  reading,
  label,
  className,
}: {
  value: number;
  reading: string;
  label: string;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const needleAngle = ARC_START + clamped * ARC_SWEEP;

  return (
    <div
      role="img"
      aria-label={`${reading} ${label}`}
      className={cn("relative mx-auto size-40 shrink-0", className)}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true" fill="none" className="size-full">
        <path
          d={TRACK_PATH}
          className="text-foreground/15"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d={TRACK_PATH}
          className="instrument-dial-fill text-primary"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          style={{ "--dial-fill": 1 - clamped } as React.CSSProperties}
        />

        {TICK_ANGLES.map((angle) => {
          const isCardinal = angle % 60 === 0;
          const outer = polarPoint(angle, 92);
          const inner = polarPoint(angle, isCardinal ? 82 : 87);
          return (
            <line
              key={angle}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              className="text-foreground/30"
              stroke="currentColor"
              strokeWidth={isCardinal ? 1.5 : 1}
            />
          );
        })}

        <g
          className="instrument-dial-needle"
          style={{ "--dial-value": `${needleAngle}deg`, "--dial-rest": "-150deg" } as React.CSSProperties}
        >
          <path d="M100 30 L105 100 L100 106 L95 100 Z" className="text-primary" fill="currentColor" />
        </g>
        <circle cx="100" cy="100" r="4" className="text-primary" fill="currentColor" />
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center">
        <p className="text-2xl font-semibold tabular-nums text-foreground">{reading}</p>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      </div>
    </div>
  );
}
