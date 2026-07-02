import { CmsImage } from "@/components/media/cms-image";
import type { ResolvedMediaAsset } from "@/types/media";

/**
 * Layer 3 — the doctor portrait itself. Deliberately NOT a card: no
 * background, border, shadow, or rounded frame. Just a large transparent
 * image that fades into HeroBackground at its lower edge so the instructor
 * feels like part of the Hero rather than a photo placed on top of it.
 * The instructor's name/title are conveyed accessibly via
 * FloatingInstructorCard, so this layer is presentational only.
 */
export function HeroPortrait({
  image,
  priority,
}: {
  image: ResolvedMediaAsset;
  priority?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        maskImage: "linear-gradient(to bottom, black 76%, transparent 98%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 76%, transparent 98%)",
      }}
    >
      <CmsImage
        asset={image}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 40vw, 70vw"
        className="object-contain object-bottom"
      />
    </div>
  );
}
