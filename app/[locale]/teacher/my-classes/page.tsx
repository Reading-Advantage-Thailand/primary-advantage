import { Header } from "@/components/header";
import MyClasses from "@/components/teacher/my-classes";
import { getTranslations } from "next-intl/server";

/**
 * Renders the my classes page with a header and MyClasses component.
 */
export default async function MyClassesPage() {
  const t = await getTranslations("TeacherMyClasses.page");
  return (
    <div className="flex flex-col gap-2">
      <Header heading={t("title")} text={t("description")} />
      <MyClasses />
    </div>
  );
}
