"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, Globe, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { publishArticleAction, unpublishArticleAction } from "@/blog/actions/article.actions";
import type { ArticleStatus } from "@/blog/types/article-status";

/**
 * The author edit page's status bar — publish/unpublish without the Admin
 * Panel (the admin list keeps its own row actions). No
 * `expectedUpdatedAt` is passed: a status flip has no fields to clobber,
 * and the form alongside tracks its own concurrency baseline.
 */
export function PublishArticleControls({
  articleId,
  slug,
  status,
}: {
  articleId: string;
  slug: string;
  status: ArticleStatus;
}) {
  const t = useTranslations("Blog.author");
  const tStatus = useTranslations("Admin.articles.status");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const action = status === "published" ? unpublishArticleAction : publishArticleAction;
      const result = await action(articleId);
      if (result.success) {
        toast.success(status === "published" ? t("unpublished") : t("published"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {t("statusLabel")}{" "}
        <span
          className={
            status === "published" ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"
          }
        >
          {tStatus(status)}
        </span>
      </p>
      <div className="flex items-center gap-2">
        {status === "published" && (
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/blog/${slug}`} />}>
            <Eye aria-hidden="true" className="size-4" />
            {t("viewArticle")}
          </Button>
        )}
        <Button size="sm" variant={status === "published" ? "outline" : "default"} onClick={handleToggle} disabled={isPending}>
          {status === "published" ? (
            <Undo2 aria-hidden="true" className="size-4" />
          ) : (
            <Globe aria-hidden="true" className="size-4" />
          )}
          {status === "published" ? t("unpublish") : t("publish")}
        </Button>
      </div>
    </div>
  );
}
