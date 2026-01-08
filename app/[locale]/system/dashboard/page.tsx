import React from "react";
import { Header } from "@/components/header";
import SystemDashboard from "@/components/dashboard/system/dashboard";
import { getTranslations } from "next-intl/server";
import { fetchSystemDashboardApi } from "@/utils/api-request";
import {
  QueryClient,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";

export default async function SystemDashboardPage() {
  const t = await getTranslations("System.Dashboard");

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["system-dashboard"],
    queryFn: () => fetchSystemDashboardApi("30"),
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
