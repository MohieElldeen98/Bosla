"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/auth/hooks/use-session";

const AUTHOR_ROLES = ["instructor", "admin", "super_admin"];

/** Course-authoring affordance resolved from the client session so the catalog remains ISR-compatible. */
export function AddCourseButton() {
  const t = useTranslations("CourseCatalog");
  const { user } = useSession();

  if (!user || !AUTHOR_ROLES.includes(user.role)) return null;

  return (
    <Button nativeButton={false} render={<Link href="/courses/new" />}>
      <Plus aria-hidden="true" className="size-4" />
      {t("addCourse")}
    </Button>
  );
}
