import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { MediaLibraryManager } from "@/components/admin/media/MediaLibraryManager";
import { CmsMediaService } from "@/cms/services/media.service";
import { searchMediaSchema } from "@/cms/validators/media.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `/admin/media` — the real Media Library (Phase 7, Step 7.1),
 *  replacing its "Coming Soon" placeholder. Server-side pagination/
 *  search/filter, all URL-driven, mirrors `/admin/coupons`'s exact
 *  shell. */
export default async function AdminMediaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = searchMediaSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    fileType: firstValue(rawSearchParams.type),
    folder: firstValue(rawSearchParams.folder),
    tag: firstValue(rawSearchParams.tag),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result, folders] = await Promise.all([
    getTranslations("Admin.nav.media"),
    CmsMediaService.search(filters, locale as Locale),
    CmsMediaService.listFolders(),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <MediaLibraryManager result={result} filters={filters} folders={folders} />
    </div>
  );
}
