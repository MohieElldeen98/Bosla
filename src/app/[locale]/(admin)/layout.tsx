import { requireRole } from "@/auth/guards/require-role";
import type { Locale } from "@/i18n/routing";

/** `/admin/*` — Admin and Super Admin both enter here. */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["admin", "super_admin"]);
  return <>{children}</>;
}
