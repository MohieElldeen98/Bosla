import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * The hub's second, quieter beat — three small entry points into the
 * visitor's real workspace, deliberately plainer than the console above
 * it (no dark atmosphere, no dial): the "One Restless Section Rule"
 * (DESIGN.md) means only the hero gets an authored motion moment.
 *
 * Deliberately not three separate `Card`s: same-size icon+heading+text
 * cards are the generic dashboard default this redesign exists to move
 * away from. Instead this is ONE bordered instrument panel (elevation
 * declared once — a single `ring-1`, no per-tile shadow) with three
 * switch-like segments divided by internal hairlines, closer to a real
 * console's row of controls than a card grid. The `.bg-dot-grid`
 * "instrument grain" texture (already used behind the marketing
 * homepage and `cta-section.tsx`, see globals.css) reinforces the same
 * panel read, reused rather than invented.
 */
export function QuickLinksRow({ links }: { links: QuickLink[] }) {
  return (
    <section className="relative">
      <div aria-hidden="true" className="instrument-rail" />
      <div
        aria-hidden="true"
        className="bg-dot-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]"
      />
      <div className="relative mx-auto px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-border overflow-hidden rounded-2xl ring-1 ring-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col gap-3 bg-card p-6 transition-colors hover:bg-primary/5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md text-primary ring-1 ring-foreground/15 transition-colors group-hover:ring-primary/50">
                <link.icon aria-hidden="true" className="size-4.5" />
              </span>
              <p className="text-sm font-medium tracking-wide text-foreground uppercase">{link.label}</p>
              <div aria-hidden="true" className="h-px w-8 bg-border" />
              <p className="text-xs text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
