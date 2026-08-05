import type { ReactNode } from "react";

/**
 * The hub's one dark, atmospheric beat — same `.night-sky-nebula` /
 * `.hero-atmosphere-glow` treatment as the marketing homepage's own Hero
 * (same OKLCH values, same drift timing), so a signed-in visitor lands
 * somewhere that still feels like Bosla, not a different product. The
 * `.dark` class here is local scoping (Tailwind v4 `dark:` variant),
 * not a site-wide toggle — same convention `hero-stage.tsx`/
 * `problem-stage.tsx` already use.
 *
 * Framed as a console, not a greeting card: a ticked `.instrument-rail`
 * stands in for a panel's mounting rail, and `children` (each role's
 * `InstrumentDial` plus its own content) is the console's actual
 * readout — the CompassMark that used to sit here was purely decorative;
 * the dial replacing it is the same needle-settle moment pointed at
 * something real.
 */
export function LoggedInHero({ greeting, children }: { greeting: string; children: ReactNode }) {
  return (
    <section className="dark relative isolate overflow-hidden bg-background">
      <div aria-hidden="true" className="night-sky-nebula" />
      <div aria-hidden="true" className="hero-atmosphere-glow" />
      <div className="relative mx-auto max-w-4xl px-6 pt-12 pb-20 lg:px-8 lg:pt-16 lg:pb-28">
        <div
          aria-hidden="true"
          className="instrument-rail hero-reveal mx-auto max-w-xs"
          style={{ "--reveal-delay": "0s" } as React.CSSProperties}
        />
        <h1
          className="hero-reveal mt-8 text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}
        >
          {greeting}
        </h1>
        <div className="hero-reveal mt-12" style={{ "--reveal-delay": "0.2s" } as React.CSSProperties}>
          {children}
        </div>
      </div>
    </section>
  );
}
