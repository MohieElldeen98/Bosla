import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function SidebarItem({
  href,
  label,
  icon: Icon,
  active,
  comingSoon,
  comingSoonLabel,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  comingSoon?: boolean;
  comingSoonLabel?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active
          ? "bg-primary/10 text-primary"
          : comingSoon
            ? "text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon aria-hidden="true" className="size-4.5 shrink-0" />
      <span className="truncate">{label}</span>
      {comingSoon && (
        <span className="ms-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {comingSoonLabel}
        </span>
      )}
    </Link>
  );
}
