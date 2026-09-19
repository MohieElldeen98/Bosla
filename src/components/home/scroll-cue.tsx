import type { Ref } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A bouncing "there's more below" arrow for the spots on this page where
 * a section ends in a lot of whitespace (or a pinned, quiet scene) and a
 * visitor could reasonably read it as the end of the site. Decorative
 * only — `aria-hidden`, and the bounce is `motion-safe:` so a
 * reduced-motion visitor gets a still arrow instead.
 */
export function ScrollCue({ ref, className }: { ref?: Ref<HTMLDivElement>; className?: string }) {
  return (
    <div ref={ref} aria-hidden="true" className={cn("flex justify-center text-muted-foreground", className)}>
      <ChevronDown className="size-7 motion-safe:animate-bounce" strokeWidth={1.75} />
    </div>
  );
}
