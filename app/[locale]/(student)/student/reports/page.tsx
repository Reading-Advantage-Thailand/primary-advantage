import { Header } from "@/components/header";
import React from "react";
import { getTranslations } from "next-intl/server";
import StudentDashboardContent from "@/components/dashboard/student/dashboard";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import {
  fetchAISummaryApi,
  fetchStudentDashboardApi,
} from "@/utils/api-request";
import { currentUser } from "@/lib/session";

export default async function ReportsPage() {
  const t = await getTranslations("Student.Dashboard");
  const user = await currentUser();
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => fetchStudentDashboardApi(),
  });

  await queryClient.prefetchQuery({
    queryKey: ["ai-insights", "student", user?.id],
    queryFn: () => fetchAISummaryApi("student", user?.id),
  });

  return (
    <>
      <Header heading={t("title")} />
      <div className="space-y-6">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <StudentDashboardContent />
        </HydrationBoundary>
      </div>
    </>
  );
}
