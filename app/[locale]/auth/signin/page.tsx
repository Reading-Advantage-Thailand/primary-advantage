import { StudentSignInForm } from "@/components/auth/student-signin-form";
import { TeacherSignInForm } from "@/components/auth/teacher-signin-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookTextIcon, SchoolIcon } from "lucide-react";

export default function SignInPage() {
  return (
    <Tabs defaultValue="student">
      <TabsList className="w-full ">
        <TabsTrigger value="student" className="cursor-pointer">
          <BookTextIcon />
          Student
        </TabsTrigger>
        <TabsTrigger value="teacher" className="cursor-pointer">
          <SchoolIcon />
          Teacher
        </TabsTrigger>
      </TabsList>
      <TabsContent value="student">
        <StudentSignInForm />
      </TabsContent>
      <TabsContent value="teacher">
        <TeacherSignInForm />
      </TabsContent>
    </Tabs>
  );
}
