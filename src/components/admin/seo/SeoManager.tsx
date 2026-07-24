"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { EmptyState } from "@/components/admin/EmptyState";
import { SeoForm } from "@/components/admin/homepage/SeoForm";
import { ContentSeoAccordion, type AttachSeoMetaResult, type SeoContentItem } from "@/components/admin/seo/ContentSeoAccordion";
import { attachSeoMetaAction } from "@/courses/actions/course.actions";
import { attachArticleSeoMetaAction } from "@/blog/actions/article.actions";
import { getSeoMetaAction } from "@/cms/actions/seo.actions";
import type { SeoMeta } from "@/cms/types/seo";

/** After attaching, re-fetches the freshly created record rather than
 *  approximating its `updatedAt` client-side — a mismatch there would
 *  make the very next save fail the optimistic-concurrency check. */
async function loadAttachedSeo(seoMetaId: string | null | undefined): Promise<AttachSeoMetaResult> {
  if (!seoMetaId) return { success: false, message: "Could not set up SEO for this page." };
  const seo = await getSeoMetaAction(seoMetaId);
  if (!seo) return { success: false, message: "Could not set up SEO for this page." };
  return { success: true, seoMetaId, seo };
}

async function attachCourseSeo(id: string): Promise<AttachSeoMetaResult> {
  const result = await attachSeoMetaAction(id);
  if (!result.success) return { success: false, message: result.message };
  return loadAttachedSeo(result.data.seoMetaId);
}

async function attachArticleSeo(id: string): Promise<AttachSeoMetaResult> {
  const result = await attachArticleSeoMetaAction(id);
  if (!result.success) return { success: false, message: result.message };
  return loadAttachedSeo(result.data.seoMetaId);
}

/**
 * `/admin/seo` — one place to edit search-result title/description, the
 * social preview image, and the canonical URL for every page that has
 * one: the homepage (its own single record), and every Course and
 * Article (each already gets a `cms_seo_meta` row auto-created at
 * creation, docs/cms-overview.md §7 — this page is the first UI that
 * lets anyone actually edit those). Every tab reuses the exact same
 * `SeoForm` the Homepage CMS editor already uses; there's no second SEO
 * editor anywhere in this codebase.
 */
export function SeoManager({
  homepage,
  courses,
  articles,
}: {
  homepage: { seoMetaId: string; seo: SeoMeta } | null;
  courses: SeoContentItem[];
  articles: SeoContentItem[];
}) {
  const t = useTranslations("Admin.seo");

  return (
    <Tabs defaultValue="homepage">
      <TabsList>
        <TabsTab value="homepage">{t("tabs.homepage")}</TabsTab>
        <TabsTab value="courses">{t("tabs.courses")}</TabsTab>
        <TabsTab value="articles">{t("tabs.articles")}</TabsTab>
      </TabsList>

      <TabsPanel value="homepage">
        {homepage ? (
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">{t("homepage.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("homepage.description")}</p>
            </div>
            <SeoForm seoMetaId={homepage.seoMetaId} seo={homepage.seo} onSaved={() => {}} onDirtyChange={() => {}} />
          </div>
        ) : (
          <EmptyState title={t("homepage.missingTitle")} description={t("homepage.missingDescription")} />
        )}
      </TabsPanel>

      <TabsPanel value="courses">
        <ContentSeoAccordion
          items={courses}
          domain="course"
          onAttach={attachCourseSeo}
          searchPlaceholder={t("searchPlaceholder")}
          emptyTitle={t("courses.emptyTitle")}
          emptyDescription={t("courses.emptyDescription")}
          noResultsTitle={t("noResultsTitle")}
          noResultsDescription={t("noResultsDescription")}
          clearSearchLabel={t("clearSearch")}
          customSeoLabel={t("customSeo")}
          defaultSeoLabel={t("defaultSeo")}
          setUpSeoLabel={t("setUpSeo")}
          settingUpSeoLabel={t("settingUpSeo")}
        />
      </TabsPanel>

      <TabsPanel value="articles">
        <ContentSeoAccordion
          items={articles}
          domain="article"
          onAttach={attachArticleSeo}
          searchPlaceholder={t("searchPlaceholder")}
          emptyTitle={t("articles.emptyTitle")}
          emptyDescription={t("articles.emptyDescription")}
          noResultsTitle={t("noResultsTitle")}
          noResultsDescription={t("noResultsDescription")}
          clearSearchLabel={t("clearSearch")}
          customSeoLabel={t("customSeo")}
          defaultSeoLabel={t("defaultSeo")}
          setUpSeoLabel={t("setUpSeo")}
          settingUpSeoLabel={t("settingUpSeo")}
        />
      </TabsPanel>
    </Tabs>
  );
}
