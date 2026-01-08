"use client";

import React, { useEffect, useState, useCallback } from "react";
import { TeacherOverviewKPIs } from "./teacher-overview-kpis";
import { ClassSummaryTable, ClassSummaryData } from "./class-summary-table";
import AIInsights from "../ai-insights";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { fetchTeacherDashboardApi } from "@/utils/api-request";
import { useCurrentUser } from "@/hooks/use-current-user";

export function TeacherDashboardContent() {
  const t = useTranslations("Teacher.Dashboard");
  const [mounted, setMounted] = useState(false);
  const user = useCurrentUser();

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["teacher-dashboard", user?.id],
    queryFn: () => fetchTeacherDashboardApi(),
  });

  if (isPending) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error.title")}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            {error instanceof Error ? error.message : "Unknown error"}
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("error.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* KPI Cards */}
      <TeacherOverviewKPIs
        data={{
          totalClasses: data?.summary?.totalClasses || 0,
          totalStudents: data?.summary?.totalStudents || 0,
          activeStudents30d: data?.summary?.activeStudents30d || 0,
          averageClassLevel: data?.summary?.averageClassLevel || 0,
          pendingAssignments: data?.summary?.pendingAssignments || 0,
          studentsActiveToday: data?.recentActivity?.studentsActiveToday || 0,
          assignmentsCompletedToday:
            data?.recentActivity?.assignmentsCompletedToday || 0,
        }}
        loading={isPending}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Class Summary Table - Takes 2/3 width on large screens */}
        <div>
          <ClassSummaryTable
            classes={data?.classes?.classesData || []}
            loading={isPending}
          />
        </div>

        {/* AI Insights for all teacher's classes */}
        <div>
          <AIInsights scope="teacher" contextId={user?.id} />
        </div>
      </div>

      {/* Last Update Timestamp */}
      {/* <div className="text-muted-foreground text-right text-xs">
        {t("lastUpdated", {
          time: mounted ? lastUpdate.toLocaleTimeString() : "--:--:--",
        })}
      </div> */}
    </>
  );
}
