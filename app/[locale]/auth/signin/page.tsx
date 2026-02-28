import { StudentSignInForm } from "@/components/auth/student-signin-form";
import { TeacherSignInForm } from "@/components/auth/teacher-signin-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookTextIcon, SchoolIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Sign In | Primary Advantage",
  description:
    "Sign in to your Primary Advantage account as a student or teacher.",
};

export default async function SignInPage() {
  const t = await getTranslations("AuthPage.signin");

  return (
    <Tabs defaultValue="student">
      <TabsList className="w-full">
        <TabsTrigger value="student" className="cursor-pointer">
          <BookTextIcon />
          {t("student")}
        </TabsTrigger>
        <TabsTrigger value="teacher" className="cursor-pointer">
          <SchoolIcon />
          {t("teacher")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="student">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
          <StudentSignInForm />
        </Suspense>
      </TabsContent>
      <TabsContent value="teacher">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
          <TeacherSignInForm />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
