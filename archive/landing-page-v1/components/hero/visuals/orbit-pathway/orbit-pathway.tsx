"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ORBIT_CONFIG, VIEW_HEIGHT, VIEW_WIDTH, type OrbitNode } from "./config";
import { ORBIT_ICONS } from "./icons";
import "./orbit-pathway.css";

// Ellipse expressed as a path (not the native <ellipse> element) so a
// travelling dot can ride it via <animateMotion href="#id">.
function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
}

// Quadratic curve between two points, bowed sideways by `bend`.
function curvePath(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (mx - (dy / len) * bend).toFixed(1);
  const cy = (my + (dx / len) * bend).toFixed(1);
  return `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`;
}

function pct(value: number, total: number) {
  return `${((value / total) * 100).toFixed(4)}%`;
}

const STAR_PATH =
  "M12 0c.7 7.6 3.7 10.9 12 12-8.3 1.1-11.3 4.4-12 12-.7-7.6-3.7-10.9-12-12C8.3 10.9 11.3 7.6 12 0Z";

const POINTS: Record<string, { x: number; y: number }> = { core: ORBIT_CONFIG.core };
for (const node of ORBIT_CONFIG.nodes) POINTS[node.id] = node;

/**
 * "The Pathway to Clinical Mastery" — orbital knowledge-graph illustration.
 * Ported from reference/orbit-mastery.js: same 900x620 coordinate space,
 * same pause/reduced-motion contract as `NightSky`. Geometry lives in
 * `./config.ts`; this file only lays it out and wires the observers.
 */
export default function OrbitPathway({ className }: { className?: string }) {
  const t = useTranslations("Hero.orbitPathway");
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const baseId = useId();

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = !reduced;

    function unit() {
      const width = root!.getBoundingClientRect().width;
      if (width) root!.style.setProperty("--u", (width / VIEW_WIDTH).toFixed(4));
    }
    function play() {
      root!.classList.remove("is-paused");
      svg!.unpauseAnimations();
    }
    function pause() {
      root!.classList.add("is-paused");
      svg!.pauseAnimations();
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(unit);
      ro.observe(root);
    } else {
      window.addEventListener("resize", unit);
    }
    unit();

    if (reduced) {
      pause();
      return () => {
        ro?.disconnect();
        window.removeEventListener("resize", unit);
      };
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting && !document.hidden;
          if (visible) play();
          else pause();
        },
        { threshold: 0.05 },
      );
      io.observe(root);
    }

    function onVisibilityChange() {
      if (document.hidden) pause();
      else if (visible) play();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", unit);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div ref={rootRef} dir="ltr" className={cn("orb", className)}>
      <svg
        ref={svgRef}
        className="orb__svg"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {ORBIT_CONFIG.links.map((link) => {
          const a = POINTS[link.from];
          const b = POINTS[link.to];
          if (!a || !b) return null;
          return <path key={`${link.from}-${link.to}`} className="orb__link" d={curvePath(a, b, link.bend)} />;
        })}

        {ORBIT_CONFIG.rings.map((ring, i) => {
          const pathId = `${baseId}-ring-${i}`;
          return (
            <g
              key={i}
              className="orb__spin"
              style={{ "--dur": `${ring.dur}s`, "--dir": ring.dir === -1 ? "reverse" : "normal" } as CSSProperties}
            >
              <g transform={`rotate(${ring.rot} ${ORBIT_CONFIG.core.x} ${ORBIT_CONFIG.core.y})`}>
                <path
                  id={pathId}
                  className={cn("orb__ring", ring.flow && "orb__ring--flow")}
                  d={ellipsePath(ORBIT_CONFIG.core.x, ORBIT_CONFIG.core.y, ring.rx, ring.ry)}
                />
                {ring.travel ? (
                  <circle className="orb__travel" r={2.6} cx={0} cy={0}>
                    <animateMotion dur={`${ring.travel}s`} repeatCount="indefinite" rotate="auto">
                      <mpath href={`#${pathId}`} xlinkHref={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                ) : null}
              </g>
            </g>
          );
        })}
      </svg>

      <div
        className="orb__core"
        style={{ left: pct(ORBIT_CONFIG.core.x, VIEW_WIDTH), top: pct(ORBIT_CONFIG.core.y, VIEW_HEIGHT) }}
      >
        <span className="orb__halo" />
        <span className="orb__ball">
          <span className="orb__swirl" />
        </span>
        <span className="orb__halo2" />
        <span className="orb__corelabel">{t(ORBIT_CONFIG.core.labelKey)}</span>
      </div>

      {ORBIT_CONFIG.nodes.map((node, i) => (
        <OrbitNodeView key={node.id} node={node} index={i} label={t(node.labelKey)} />
      ))}

      {ORBIT_CONFIG.dots.map((dot, i) => (
        <span
          key={i}
          className="orb__dot"
          style={
            {
              left: pct(dot.x, VIEW_WIDTH),
              top: pct(dot.y, VIEW_HEIGHT),
              width: `calc(${dot.r * 2}px * var(--u))`,
              height: `calc(${dot.r * 2}px * var(--u))`,
              "--a": dot.accent,
              "--d": `${(i * 0.7).toFixed(2)}s`,
            } as CSSProperties
          }
        />
      ))}

      {ORBIT_CONFIG.tags.map((tag, i) => (
        <div
          key={i}
          className={cn("orb__tag", tag.side === "left" ? "orb__tag--left" : "orb__tag--right")}
          style={{ left: pct(tag.x, VIEW_WIDTH), top: pct(tag.y, VIEW_HEIGHT) }}
        >
          {t(tag.textKey)}
          <i />
        </div>
      ))}

      {ORBIT_CONFIG.sparkles.map((spark, i) => (
        <span
          key={i}
          className="orb__spark"
          style={
            {
              left: pct(spark.x, VIEW_WIDTH),
              top: pct(spark.y, VIEW_HEIGHT),
              width: `calc(${spark.s}px * var(--u))`,
              height: `calc(${spark.s}px * var(--u))`,
              "--d": `${(i * 0.55).toFixed(2)}s`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={STAR_PATH} />
          </svg>
        </span>
      ))}
    </div>
  );
}

function OrbitNodeView({ node, index, label }: { node: OrbitNode; index: number; label: string }) {
  const Icon = ORBIT_ICONS[node.icon];
  return (
    <div className="orb__node" style={{ left: pct(node.x, VIEW_WIDTH), top: pct(node.y, VIEW_HEIGHT) }}>
      <span className="orb__lift" style={{ "--d": `${(index * 0.9).toFixed(2)}s` } as CSSProperties}>
        <span className="orb__disc" style={{ "--s": node.size, "--a": node.accent } as CSSProperties}>
          <Icon />
        </span>
        <span className="orb__name">{label}</span>
      </span>
    </div>
  );
}
