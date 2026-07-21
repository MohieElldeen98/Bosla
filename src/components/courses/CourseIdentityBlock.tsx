import Image from "next/image";
import { cn } from "@/lib/utils";

export function CourseIdentityBlock({
  density,
  title,
  instructorName,
  instructorQualification,
  instructorAvatarUrl,
  level,
  tLevel,
  thumbnailUrl,
  thumbnailAlt = "",
  thumbnailOverlay,
  thumbnailPlaceholder,
  eyebrow,
  showLevel = true,
}: {
  density: "card" | "row" | "header";
  title: string;
  instructorName: string;
  instructorQualification?: string | null;
  instructorAvatarUrl?: string | null;
  level: string;
  tLevel: (level: string) => string;
  thumbnailUrl?: string | null;
  thumbnailAlt?: string;
  thumbnailOverlay?: React.ReactNode;
  thumbnailPlaceholder?: React.ReactNode;
  eyebrow?: React.ReactNode;
  showLevel?: boolean;
}) {
  const initials = instructorName.trim().charAt(0).toLocaleUpperCase();
  const instructor = (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground">
        {instructorAvatarUrl ? (
          <Image src={instructorAvatarUrl} alt="" fill sizes="24px" className="object-cover" />
        ) : (
          initials
        )}
      </span>
      <span className="truncate text-muted-foreground">{instructorName}</span>
      {instructorQualification && (
        <span className="shrink-0 truncate text-xs text-muted-foreground">{instructorQualification}</span>
      )}
    </div>
  );

  // Titles render as styled divs, not headings — this block appears inside
  // cards, rows, and chrome bars whose pages own their heading outline;
  // a consumer that needs a semantic heading wraps the block itself.
  if (density === "header") {
    return (
      <div className="min-w-0">
        <div className="truncate text-lg font-semibold">{title}</div>
        {instructor}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", density === "row" && "flex items-center gap-4")}>
      {thumbnailUrl !== undefined && (
        <div className={cn("relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent", density === "row" ? "size-20 rounded-lg" : "aspect-video w-full")}>
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={thumbnailAlt}
              fill
              sizes={density === "row" ? "80px" : "33vw"}
              className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
            />
          ) : thumbnailPlaceholder}
          {thumbnailOverlay}
        </div>
      )}
      {/* On a card the text sits under a full-bleed thumbnail, so it needs
          its own gutter + top breathing room; the row density lays out
          horizontally and is padded by its container instead. */}
      <div className={cn(density === "row" ? "min-w-0" : "px-5 pt-4")}>
        {eyebrow}
        <div
          className={cn(
            "font-semibold transition-colors group-hover:text-primary",
            density === "row"
              ? "line-clamp-2 text-base"
              // Reserve two lines so a one-line title doesn't shove the
              // instructor + meta rows up out of line with its neighbours.
              : "line-clamp-2 min-h-[3.25rem] text-lg leading-snug",
          )}
        >
          {title}
        </div>
        <div className="mt-3">{instructor}</div>
        {showLevel && <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{tLevel(level)}</span>}
      </div>
    </div>
  );
}
