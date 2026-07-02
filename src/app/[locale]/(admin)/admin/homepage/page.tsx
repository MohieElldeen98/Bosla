import { getTranslations } from "next-intl/server";
import { CmsPageService } from "@/cms/services/page.service";
import { CmsSectionService } from "@/cms/services/section.service";
import { CmsSeoService } from "@/cms/services/seo.service";
import { EmptyState } from "@/components/admin/EmptyState";
import { HomepageEditor } from "@/components/admin/homepage/HomepageEditor";

/**
 * `/admin/homepage` — the real Homepage CMS editor (Step 6.4), replacing
 * the Step 6.3 placeholder. Reads the "home" page's raw (bilingual,
 * unresolved) sections and SEO record directly through the existing
 * Repository -> Service layers — the same `CmsPageService`/
 * `CmsSectionService`/`CmsSeoService` the public homepage reads through
 * `HomepageService` (Step 6.2), just unresolved here since editing needs
 * every locale's value, not one flattened string. Reads are unrestricted by
 * design (docs/cms-overview.md §1); this route itself is already gated to
 * Admin/Super Admin by `(admin)/layout.tsx`.
 */
export default async function AdminHomepagePage() {
  const page = await CmsPageService.getBySlug("home");

  if (!page) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const [sections, seo] = await Promise.all([
    CmsSectionService.getByPageId(page.id),
    page.seoMetaId ? CmsSeoService.getById(page.seoMetaId) : Promise.resolve(null),
  ]);

  return (
    <HomepageEditor
      pageId={page.id}
      initialSections={sections}
      seoMetaId={page.seoMetaId}
      initialSeo={seo}
    />
  );
}
