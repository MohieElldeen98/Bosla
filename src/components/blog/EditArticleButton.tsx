"use client";

import { useEffect, useState } from "react";
import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getArticleManageAccessAction } from "@/blog/actions/article.actions";

/**
 * The article page's "Edit article" affordance — shown only to the
 * article's own author or a blog manager, resolved client-side
 * (`getArticleManageAccessAction`) so `/blog/[slug]` stays ISR-cached.
 * Presentation only; the edit page and every mutation re-check
 * server-side.
 */
export function EditArticleButton({ articleId, slug }: { articleId: string; slug: string }) {
  const t = useTranslations("Blog.author");
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getArticleManageAccessAction(articleId).then((allowed) => {
      if (!cancelled) setCanEdit(allowed);
    });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  if (!canEdit) return null;

  return (
    <Link
      href={`/blog/${slug}/edit`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
    >
      <PenLine aria-hidden="true" className="size-3.5" />
      {t("editArticle")}
    </Link>
  );
}
