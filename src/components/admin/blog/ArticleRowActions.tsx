"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteArticleAction,
  publishArticleAction,
  unpublishArticleAction,
} from "@/blog/actions/article.actions";
import type { ArticleListItem } from "@/blog/types/article-search";

/**
 * Per-row menu for `/admin/articles` — Publish/Unpublish call
 * `ArticleService`'s dedicated status transitions (each only offered from
 * the one status it's valid from; the service re-checks regardless).
 * Delete confirms via `window.confirm`, matching `CourseRowActions`'s
 * precedent (no shared AlertDialog primitive exists yet); it's Admin-level
 * here, not Super-Admin-only — see `ArticleService.delete`'s doc comment.
 */
export function ArticleRowActions({ article }: { article: ArticleListItem }) {
  const t = useTranslations("Admin.articles");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handlePublish() {
    startTransition(async () => {
      const result = await publishArticleAction(article.id, article.updatedAt);
      if (result.success) {
        toast.success(t("toasts.published"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleUnpublish() {
    startTransition(async () => {
      const result = await unpublishArticleAction(article.id, article.updatedAt);
      if (result.success) {
        toast.success(t("toasts.unpublished"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(t("confirm.delete", { title: article.title }))) return;
    startTransition(async () => {
      const result = await deleteArticleAction(article.id);
      if (result.success) {
        toast.success(t("toasts.deleted"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            aria-label={t("actionsFor", { title: article.title })}
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/articles/${article.id}/edit`)}>
          {t("actions.edit")}
        </DropdownMenuItem>
        {article.status === "draft" ? (
          <DropdownMenuItem onClick={handlePublish}>{t("actions.publish")}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleUnpublish}>{t("actions.unpublish")}</DropdownMenuItem>
        )}
        {article.status === "published" && (
          <DropdownMenuItem onClick={() => window.open(`/blog/${article.slug}`, "_blank")}>
            {t("actions.view")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          {t("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
