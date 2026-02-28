import { Header } from "@/components/header";
import ClassroomSelector from "@/components/teacher/classroom-selector";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Class Roster | Primary Advantage",
  description: "View and manage your classroom rosters and student enrolment.",
};

export default async function ClassRosterPage() {
  const t = await getTranslations("Teacher.ClassRoster");
  return (
    <div className="flex flex-col gap-2">
      <Header heading={t("title")} text={t("description")} />
      <ClassroomSelector />
    </div>
  );
}
