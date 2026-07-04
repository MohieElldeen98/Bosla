import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function SectionCard({
  title,
  description,
  icon: Icon,
  href,
  comingSoon,
  comingSoonLabel,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  comingSoon?: boolean;
  comingSoonLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-2">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {comingSoon && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {comingSoonLabel}
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
      />
    </Link>
  );
}
