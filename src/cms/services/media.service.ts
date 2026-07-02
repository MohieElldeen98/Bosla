import { CmsMediaRepository, type NewCmsMediaAssetInput } from "@/cms/repositories/media.repository";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { CmsActionResult } from "@/cms/types/result";
import type { MediaAsset, ResolvedMediaAsset } from "@/types/media";

/** Orchestration for `cms_media_assets` — the Media Library
 *  (docs/cms-overview.md §10). No uploader UI exists yet; this resolves
 *  media *references* (`imageId` fields on section content) to a
 *  locale-flattened asset, the same job the existing
 *  `MediaService.getById` (mock-backed) does for the Hero today. */
export const CmsMediaService = {
  async getById(id: string): Promise<MediaAsset | null> {
    return safeRead(() => CmsMediaRepository.findById(id), null);
  },

  async getResolvedById(id: string, locale: Locale): Promise<ResolvedMediaAsset | null> {
    const asset = await safeRead(() => CmsMediaRepository.findById(id), null);
    if (!asset) return null;
    return {
      id: asset.id,
      url: asset.url,
      alt: asset.alt[locale],
      width: asset.width,
      height: asset.height,
      placeholder: asset.placeholder,
    };
  },

  async list(): Promise<MediaAsset[]> {
    return safeRead(() => CmsMediaRepository.findAll(), []);
  },

  async create(input: NewCmsMediaAssetInput): Promise<CmsActionResult<MediaAsset>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot upload CMS media." };
      }
      const created = await CmsMediaRepository.create(input);
      return { success: true, data: created };
    });
  },

  async delete(id: string): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot delete CMS media." };
      }
      await CmsMediaRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
