import React from "react";
import { Header } from "@/components/header";
import { AdminDashboardContent } from "@/components/dashboard/admin/dashboard";
import { getTranslations } from "next-intl/server";
import {
  QueryClient,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import {
  fetchAdminDashboardApi,
  fetchAISummaryApi,
  fetchLicensesApi,
} from "@/utils/api-request";
import { currentUser } from "@/lib/session";
import { Role } from "@/types/enum";

export default async function AdminDashboardPage() {
  const t = await getTranslations("Admin.Dashboard");
  const user = await currentUser();

  const queryClient = new QueryClient();

  if (user?.role === Role.admin) {
    await queryClient.prefetchQuery({
      queryKey: ["admin-dashboard", user?.schoolId, "30"],
      queryFn: () => fetchAdminDashboardApi(user?.schoolId, "30"),
      retry: 2,
    });

    await queryClient.prefetchQuery({
      queryKey: ["ai-insights", "license", user?.schoolId],
      queryFn: () => fetchAISummaryApi("license", user?.schoolId),
      retry: 2,
    });
  }

  if (user?.role === Role.system) {
    await queryClient.prefetchQuery({
      queryKey: ["system-school-list", user?.id],
      queryFn: () => fetchLicensesApi(),
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
