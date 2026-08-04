import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";

export interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * The hub's second, quieter beat — three small entry points into the
 * visitor's real workspace, deliberately plainer than the hero above it
 * (no dark atmosphere, no compass accent): the "One Restless Section
 * Rule" (DESIGN.md) means only the hero gets an authored motion moment.
 */
export function QuickLinksRow({ links }: { links: QuickLink[] }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 py-16 sm:grid-cols-3 lg:px-8">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="group block h-full">
            <Card className="h-full gap-3 p-5 ring-1 ring-foreground/10 transition-shadow group-hover:shadow-card-hover">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <link.icon aria-hidden="true" className="size-4.5" />
                </span>
                <p className="text-sm font-medium text-foreground">{link.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{link.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
