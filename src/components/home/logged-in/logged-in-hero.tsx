import type { ReactNode } from "react";
import { CompassMark } from "@/components/home/compass-mark";

/**
 * The hub's one dark, atmospheric beat — same `.night-sky-nebula` /
 * `.hero-atmosphere-glow` treatment as the marketing homepage's own Hero
 * (same OKLCH values, same drift timing), so a signed-in visitor lands
 * somewhere that still feels like Bosla, not a different product. The
 * `.dark` class here is local scoping (Tailwind v4 `dark:` variant),
 * not a site-wide toggle — same convention `hero-stage.tsx`/
 * `problem-stage.tsx` already use.
 */
export function LoggedInHero({ greeting, children }: { greeting: string; children: ReactNode }) {
  return (
    <section className="dark relative isolate overflow-hidden bg-background">
      <div aria-hidden="true" className="night-sky-nebula" />
      <div aria-hidden="true" className="hero-atmosphere-glow" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center lg:px-8 lg:py-28">
        <div className="hero-reveal" style={{ "--reveal-delay": "0s" } as React.CSSProperties}>
          <CompassMark className="size-16 text-foreground" />
        </div>
        <h1
          className="hero-reveal mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}
        >
          {greeting}
        </h1>
        <div className="hero-reveal mt-10 w-full" style={{ "--reveal-delay": "0.2s" } as React.CSSProperties}>
          {children}
        </div>
      </div>
    </section>
  );
}
