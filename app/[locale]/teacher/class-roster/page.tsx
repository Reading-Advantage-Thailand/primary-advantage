import { Header } from "@/components/header";
import ClassroomSelector from "@/components/teacher/classroom-selector";

export default function ClassRosterPage() {
  return (
    <div className="flex flex-col gap-2">
      <Header
        heading="Class Roster"
        text="Manage your students, view their progress, and organize your classroom."
      />
      <ClassroomSelector />
    </div>
  );
}
