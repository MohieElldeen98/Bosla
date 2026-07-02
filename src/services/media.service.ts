import type { Locale } from "@/i18n/routing";
import { MediaRepository } from "@/repositories/media.repository";
import type { ResolvedMediaAsset } from "@/types/media";

export const MediaService = {
  async getById(id: string, locale: Locale): Promise<ResolvedMediaAsset> {
    const asset = await MediaRepository.findById(id);
    if (!asset) {
      throw new Error(`MediaService: no media asset found for id "${id}"`);
    }

    return {
      id: asset.id,
      url: asset.url,
      alt: asset.alt[locale],
      width: asset.width,
      height: asset.height,
      placeholder: asset.placeholder,
    };
  },
};
