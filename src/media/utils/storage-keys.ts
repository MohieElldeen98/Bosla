import { resolveFileExtension } from "@/media/constants/mime";

/**
 * Every key a library asset ever writes lives under one
 * `library/<assetId>/` folder — one `deletePrefix` removes the original
 * plus every generated variant; nothing can orphan. (Legacy Supabase-era
 * rows used flat `library/<id>.<ext>` paths in a different backend and
 * are recognized by `storage_key IS NULL`, not by shape.) Lesson videos
 * have their own `videos/<id>/` namespace in `video/utils/storage-keys`.
 */

export function mediaAssetPrefix(assetId: string): string {
  return `library/${assetId}/`;
}

export function mediaOriginalKey(assetId: string, mimeType: string): string {
  return `${mediaAssetPrefix(assetId)}original.${resolveFileExtension(mimeType)}`;
}

export function mediaVariantKey(assetId: string, variant: string, format: string): string {
  return `${mediaAssetPrefix(assetId)}${variant}.${format}`;
}

export function mediaThumbnailKey(assetId: string): string {
  return mediaVariantKey(assetId, "thumb", "webp");
}
