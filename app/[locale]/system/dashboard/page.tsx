import React from "react";
import { Header } from "@/components/header";
import SystemDashboard from "@/components/dashboard/system/dashboard";
import { getTranslations } from "next-intl/server";
import {
  fetchAISummaryApi,
  fetchSystemActivityChartsApi,
  fetchSystemDashboardApi,
} from "@/utils/api-request";
import {
  QueryClient,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/session";

export default async function SystemDashboardPage() {
  const t = await getTranslations("System.Dashboard");
  const user = await getCurrentUser();

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["system-dashboard"],
    queryFn: () => fetchSystemDashboardApi("30"),
  });

  await queryClient.prefetchQuery({
    queryKey: ["system-activity-charts"],
    queryFn: () => fetchSystemActivityChartsApi("30"),
  });

  await queryClient.prefetchQuery({
    queryKey: ["ai-insights"],
    queryFn: () => fetchAISummaryApi("system", user?.id || ""),
  });

  return (
    <>
      <Header heading={t("title")} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SystemDashboard />
      </HydrationBoundary>
    </>
  );
}
