import { BoslaLogo } from "@/components/brand/BoslaLogo";
import { cn } from "@/lib/utils";

/**
 * The video-overlay watermark — the outline mark at low opacity, white,
 * pointer-events-none so it never intercepts player interactions.
 * Position it with the usual absolute utilities from the caller.
 */
export function BoslaWatermark({ className }: { className?: string }) {
  return (
    <BoslaLogo
      variant="outline"
      title=""
      className={cn("pointer-events-none select-none text-white opacity-30", className)}
    />
  );
}
