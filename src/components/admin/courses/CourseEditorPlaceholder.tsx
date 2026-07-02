import { Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";

/**
 * Shared "Coming Soon" content for `/admin/courses/new` and
 * `/admin/courses/[id]/edit` — the real Course Editor is Step 3.3. Not
 * `AdminPlaceholderPage` (that one is keyed off top-level `admin-nav.ts`
 * entries + `Admin.nav.<id>` copy; these are sub-routes of "courses", not
 * nav items themselves) and not the auth-domain's `ComingSoonPage` (built
 * for the public `/dashboard`/`/profile`/`/settings` routes with an
 * incompatible `pageKey` union).
 */
export async function CourseEditorPlaceholder({ title }: { title: string }) {
  const t = await getTranslations("Admin.courses.editorPlaceholder");

  return (
    <div className="space-y-6">
      <PageTitle title={title} />
      <EmptyState
        icon={Wrench}
        badge={t("badge")}
        title={t("title")}
        description={t("description")}
        action={
          <Button size="sm" nativeButton={false} render={<Link href="/admin/courses" />}>
            {t("backToList")}
          </Button>
        }
      />
    </div>
  );
}
