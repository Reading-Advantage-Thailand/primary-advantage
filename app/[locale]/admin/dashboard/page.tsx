import React from "react";
import { Header } from "@/components/header";
import { AdminDashboardContent } from "@/components/dashboard/admin/dashboard";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Admin Dashboard | Primary Advantage",
  description: "Manage your school, track school-wide student progress and AI insights.",
};
import {
  QueryClient,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import {
  fetchAdminDashboardApi,
  fetchAISummaryApi,
  fetchLicensesApi,
  fetchSchoolsListApi,
} from "@/utils/api-request";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/types/enum";

export default async function AdminDashboardPage() {
  const t = await getTranslations("Admin.Dashboard");
  const user = await getCurrentUser();

  const queryClient = new QueryClient();

  if (user?.role === Role.admin) {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["admin-dashboard", user?.schoolId, "30"],
        queryFn: () => fetchAdminDashboardApi(user?.schoolId as string, "30"),
        retry: 2,
      }),
      queryClient.prefetchQuery({
        queryKey: ["ai-insights", "license", user?.schoolId],
        queryFn: () => fetchAISummaryApi("license", user?.schoolId as string),
        retry: 2,
      }),
    ]);
  }

  if (user?.role === Role.system) {
    await queryClient.prefetchQuery({
      queryKey: ["system-school-list", user?.id],
      queryFn: () => fetchSchoolsListApi(),
      staleTime: 60 * 60 * 1000,
    });
  }

  return (
    <>
      <div className="mb-6 truncate text-xl font-bold sm:text-2xl md:text-3xl">
        <Header heading={t("title")} text={t("subtitle")} />
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminDashboardContent />
      </HydrationBoundary>
    </>
  );
}
