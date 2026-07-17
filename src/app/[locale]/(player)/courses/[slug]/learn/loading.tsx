import { getTranslations } from "next-intl/server";
import { LoadingState } from "@/components/admin/LoadingState";

export default async function CourseLearnLoading() {
  const t = await getTranslations("CoursePlayer.loading");
  return <LoadingState label={t("label")} />;
}
