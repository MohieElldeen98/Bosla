import type { LocalizedText } from "@/types/i18n";

/**
 * A single media asset as it will eventually be served from Supabase Storage /
 * a Media Library table. Components must always render a MediaAsset resolved
 * through MediaService — never a static image import — so an Admin Panel can
 * later swap `url` without touching any component.
 */
export interface MediaAsset {
  id: string;
  url: string;
  alt: LocalizedText;
  width: number;
  height: number;
  /** Solid-color fallback shown while the real asset loads. */
  placeholder?: string;
}

/** Locale-resolved view model — what components actually render. */
export interface ResolvedMediaAsset {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  placeholder?: string;
}
