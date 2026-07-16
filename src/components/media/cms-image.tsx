import Image from "next/image";
import type { ResolvedMediaAsset } from "@/types/media";

/**
 * Renders a resolved media asset. Components take a MediaAsset object and
 * never a raw URL string or a static `import photo from "./photo.jpg"` — an
 * Admin Panel replacing `asset.url` later requires no component change.
 */
export function CmsImage({
  asset,
  className,
  sizes,
  priority,
  fill = false,
}: {
  asset: ResolvedMediaAsset;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Fill the relatively-positioned parent instead of using intrinsic size. */
  fill?: boolean;
}) {
  const blurDataURL = asset.placeholder?.startsWith("data:") ? asset.placeholder : undefined;

  if (fill) {
    return (
      <Image
        src={asset.url}
        alt={asset.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
        placeholder={blurDataURL ? "blur" : undefined}
        blurDataURL={blurDataURL}
      />
    );
  }

  return (
    <Image
      src={asset.url}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      sizes={sizes}
      priority={priority}
      className={className}
      placeholder={blurDataURL ? "blur" : undefined}
      blurDataURL={blurDataURL}
    />
  );
}
