import { getTranslations } from "next-intl/server";
import { LoadingState } from "@/components/admin/LoadingState";

export default async function DashboardLoading() {
  const t = await getTranslations("Dashboard.loading");
  return <LoadingState label={t("label")} />;
}
