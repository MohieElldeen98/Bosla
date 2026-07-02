import { getTranslations } from "next-intl/server";
import { CourseEditorPlaceholder } from "@/components/admin/courses/CourseEditorPlaceholder";

export default async function AdminNewCoursePage() {
  const t = await getTranslations("Admin.courses");
  return <CourseEditorPlaceholder title={t("createCourse")} />;
}
