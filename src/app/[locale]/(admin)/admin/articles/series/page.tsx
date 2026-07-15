import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { ArticleSeriesManager } from "@/components/admin/blog/ArticleSeriesManager";
import { ArticleSeriesService } from "@/blog/services/article-series.service";
export default async function AdminArticleSeriesPage() { const [t, series] = await Promise.all([getTranslations("Admin.articleSeries"), ArticleSeriesService.list()]); return <div className="space-y-6"><PageTitle title={t("title")} description={t("description")} /><ArticleSeriesManager series={series} /></div>; }
