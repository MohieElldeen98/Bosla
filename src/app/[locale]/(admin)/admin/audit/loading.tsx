import { getTranslations } from "next-intl/server";
import { LoadingState } from "@/components/admin/LoadingState";

export default async function AdminAuditLoading() {
  const t = await getTranslations("Admin.loading");
  return <LoadingState label={t("label")} />;
}
