"use client";

import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/auth/hooks/use-session";

const AUTHOR_ROLES = ["instructor", "admin", "super_admin"];

/**
 * The blog header's "Write an article" affordance — client-side so `/blog`
 * stays ISR-cached, but role-checked against the session's own JWT
 * (`useSession().user.role`) rather than a fetched profile: the profile
 * needed an extra server-action round-trip and made the button appear a
 * second late. Renders nothing for guests/students; `/blog/new` and
 * `ArticleService.create` re-check access server-side regardless.
 */
export function WriteArticleButton() {
  const t = useTranslations("Blog.author");
  const { user } = useSession();

  if (!user || !AUTHOR_ROLES.includes(user.role)) return null;

  return (
    <Button nativeButton={false} render={<Link href="/blog/new" />}>
      <PenLine aria-hidden="true" className="size-4" />
      {t("writeArticle")}
    </Button>
  );
}
