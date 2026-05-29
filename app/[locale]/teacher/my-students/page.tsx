import { Header } from "@/components/header";
import MyStudents from "@/components/teacher/my-students";
import { getTranslations } from "next-intl/server";

/**
 * Renders the my students page with a header and MyStudents component.
 */
export default async function MyStudentsPage() {
  const t = await getTranslations("teacher.myStudents");
  return (
    <div className="flex flex-col gap-2">
      <Header heading={t("title")} text={t("description")} />
      <MyStudents />
    </div>
  );
}
