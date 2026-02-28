import React from "react";
import { getTranslations } from "next-intl/server";
import { TeacherDashboardContent } from "@/components/dashboard/teacher/dashboard";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import {
  fetchAISummaryApi,
  fetchTeacherDashboardApi,
} from "@/utils/api-request";
import { getCurrentUser } from "@/lib/session";

export const metadata = {
  title: "Teacher Dashboard | Primary Advantage",
  description:
    "Monitor your classes, track student progress, and get AI-powered insights",
};

export default async function TeacherDashboardPage() {
  const t = await getTranslations("Teacher.Dashboard");
  const user = await getCurrentUser();

  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["teacher-dashboard", user?.id],
      queryFn: () => fetchTeacherDashboardApi(),
    }),
    queryClient.prefetchQuery({
      queryKey: ["ai-insights", "teacher", user?.id],
      queryFn: () => fetchAISummaryApi("teacher", user?.id),
    }),
  ]);

  return (
    <div className="container mx-auto space-y-6 pb-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Dashboard Content */}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TeacherDashboardContent />
      </HydrationBoundary>
    </div>
  );
}
