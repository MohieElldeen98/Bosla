import { mediaAssetsMock } from "@/mock/media.mock";
import type { MediaAsset } from "@/types/media";

/**
 * Data-access layer for media assets. Reads from an in-memory mock array
 * today; a future Phase would swap this file's internals for a Drizzle query
 * against a `media_assets` table (see docs/database-overview.md §5) without
 * changing MediaService or any component.
 */
export const MediaRepository = {
  async findAll(): Promise<MediaAsset[]> {
    return mediaAssetsMock;
  },

  async findById(id: string): Promise<MediaAsset | undefined> {
    return mediaAssetsMock.find((asset) => asset.id === id);
  },
};
