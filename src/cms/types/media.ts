/**
 * CMS media re-uses the existing `MediaAsset`/`ResolvedMediaAsset` shape
 * (`src/types/media.ts`) rather than a parallel type — a `cms_media_assets`
 * row and a mock media record are the same concept (id, url, alt, width,
 * height, placeholder), just a different data source. Section content
 * fields reference media by id (`imageId: string`), resolved through
 * `CmsMediaService.getById` the same way the Hero already resolves
 * `imageId` through `MediaService.getById`.
 */
export type { MediaAsset as CmsMediaAsset, ResolvedMediaAsset as ResolvedCmsMediaAsset } from "@/types/media";
