import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/admin/ErrorState";

/** Rendered by `(admin)/layout.tsx` in place of the Admin Panel when a
 *  signed-in user's role isn't `admin`/`super_admin` — an explicit Forbidden
 *  state rather than a silent redirect, since the Admin Panel is
 *  security-sensitive enough that "nothing happened" would be confusing.
 *  See `requireRoleOrForbidden` (src/auth/guards/require-role.ts). */
export async function ForbiddenPage() {
  const t = await getTranslations("Admin.forbidden");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-md">
        <ErrorState
          title={t("title")}
          description={t("description")}
          action={
            <Button nativeButton={false} render={<Link href="/" />}>
              {t("cta")}
            </Button>
          }
        />
      </div>
    </div>
  );
}
