import { Header } from "@/components/header";
import MyClasses from "@/components/teacher/my-classes";

export default function MyClassesPage() {
  return (
    <div className="flex flex-col gap-2">
      <Header heading="My Classes" text="My Classes Description" />
      <MyClasses />
    </div>
  );
}
