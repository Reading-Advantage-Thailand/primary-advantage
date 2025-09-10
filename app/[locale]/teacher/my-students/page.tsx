import { Header } from "@/components/header";
import MyStudents from "@/components/teacher/my-students";

export default function MyStudentsPage() {
  return (
    <div className="flex flex-col gap-2">
      <Header heading="My Students" text="My Students Description" />
      <MyStudents />
    </div>
  );
}
