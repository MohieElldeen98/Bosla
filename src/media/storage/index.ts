import "server-only";

import { mediaStorageEnv } from "@/lib/env";
import { S3CompatibleStorageProvider } from "./s3-compatible.provider";
import type { StorageProvider, MediaStorageConfig } from "./types";

let instance: StorageProvider | null | undefined;

/**
 * The one place a concrete provider is chosen — for the WHOLE media
 * platform (library assets, lesson videos, attachments; see
 * docs/media-platform.md). `null` means "media storage is not
 * configured" — every caller (actions, delivery/playback routes,
 * pipelines) treats that as a graceful feature-off, mirroring how
 * `getDb()`/Supabase auth clients degrade when their env is missing.
 *
 * Both currently-supported providers happen to share the S3 wire
 * protocol, so both map to `S3CompatibleStorageProvider`; a future
 * non-S3 provider gets its own case here and nothing else changes.
 */
export function getMediaStorage(): StorageProvider | null {
  if (instance !== undefined) return instance;
  if (!mediaStorageEnv) {
    instance = null;
    return instance;
  }
  const config: MediaStorageConfig = {
    provider: mediaStorageEnv.MEDIA_STORAGE_PROVIDER,
    bucket: mediaStorageEnv.MEDIA_STORAGE_BUCKET,
    region: mediaStorageEnv.MEDIA_STORAGE_REGION,
    endpoint: mediaStorageEnv.MEDIA_STORAGE_ENDPOINT,
    accessKeyId: mediaStorageEnv.MEDIA_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: mediaStorageEnv.MEDIA_STORAGE_SECRET_ACCESS_KEY,
  };
  switch (config.provider) {
    case "r2":
    case "s3":
      instance = new S3CompatibleStorageProvider(config);
      return instance;
  }
}

/** Base URL for `visibility: "public"` assets when a CDN/public bucket
 *  domain is configured; `null` → serve through `/api/media` instead. */
export function getMediaPublicBaseUrl(): string | null {
  return mediaStorageEnv?.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? null;
}
