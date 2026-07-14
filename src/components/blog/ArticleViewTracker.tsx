"use client";

import { useEffect } from "react";
import { registerArticleViewAction } from "@/blog/actions/article.actions";

/**
 * Fires the view-count increment once after hydration — a client
 * component because the article page itself is ISR-cached (counting in
 * the server render would only count cache rebuilds, not readers).
 * Renders nothing; a failed call is silently ignored (a view counter
 * must never break the reading experience).
 */
export function ArticleViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    registerArticleViewAction(articleId).catch(() => {});
  }, [articleId]);

  return null;
}
