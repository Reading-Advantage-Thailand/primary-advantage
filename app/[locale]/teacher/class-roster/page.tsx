import { Header } from "@/components/header";
import ClassroomSelector from "@/components/teacher/classroom-selector";
import { getTranslations } from "next-intl/server";
/**
 * Renders the class roster page with a header and classroom selector component.
 */
export default async function ClassRosterPage() {
  const t = await getTranslations("Teacher.ClassRoster");
  return (
    <div className="flex flex-col gap-2">
      <Header heading={t("title")} text={t("description")} />
      <ClassroomSelector />
    </div>
  );
}
