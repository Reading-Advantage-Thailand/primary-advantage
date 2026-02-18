"use client";

import React, { useState, useCallback } from "react";
import { KPICard, KPICardSkeleton } from "@/components/dashboard/kpi-card";
import AdoptionWidget from "@/components/dashboard/admin/adoption-widget";
import TeacherEffectiveness from "@/components/dashboard/admin/teacher-effectiveness";
import AlertCenter from "@/components/dashboard/admin/alert-center";
import AIInsights from "@/components/dashboard/ai-insights";
import CompactActivityHeatmap from "@/components/dashboard/compact-activity-heatmap";
import LicenseSelector from "@/components/dashboard/admin/license-selector";

import {
  Users,
  GraduationCap,
  TrendingUp,
  Target,
  Zap,
  BookOpen,
  Activity,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboardApi } from "@/utils/api-request";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Role } from "@/types/enum";

export function AdminDashboardContent() {
  const t = useTranslations("Admin.Dashboard");
  const { user, isLoading: isSessionLoading } = useCurrentUser();

  // State management
  const [selectedSchoolId, setselectedSchoolId] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("30");

  const effectiveLicenseId =
    user?.role === Role.admin ? user?.schoolId : selectedSchoolId;

  const {
    data: overview,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["admin-dashboard", effectiveLicenseId, dateRange],
    queryFn: () =>
      fetchAdminDashboardApi(effectiveLicenseId as string, dateRange),
    enabled:
      user?.role === Role.admin
        ? true
        : user?.role === Role.system && !!selectedSchoolId,
    staleTime: 5 * 60 * 1000, // Cache 5 นาที
    refetchOnWindowFocus: false,
    placeholderData: {
      summary: {
        activeStudents: 0,
        activeTeachers: 0,
        totalTeachers: 0,
        activeClassrooms: 0,
        totalReadingSessions: 0,
      },
      recentActivity: {
        readingSessionsToday: 0,
        newUsersToday: 0,
      },
      systemHealth: {
        status: "healthy" as const,
      },
    },
  });

  // Handle license change (SYSTEM role only)
  const handleLicenseChange = useCallback((licenseId: string) => {
    setselectedSchoolId(licenseId);
  }, []);

  // Handle timeframe/dateRange change
  const handleTimeframeChange = useCallback((newDateRange: string) => {
    setDateRange(newDateRange);
  }, []);

  // Get timeframe label for descriptions
  const getTimeframeLabel = (dr: string) => {
    switch (dr) {
      case "7":
        return t("timeframeDescription.7d");
      case "90":
        return t("timeframeDescription.90d");
      case "30":
      default:
        return t("timeframeDescription.30d");
    }
  };

  const timeframeLabel = getTimeframeLabel(dateRange);

  console.log(user);

  if (isPending && !isPlaceholderData) {
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>;
  }
  return (
    <div className="space-y-6">
      {/* License Selector for SYSTEM users */}
      {!isSessionLoading && user?.role === Role.system && (
        <div className="mb-4">
          {/* TODO: ใส่ LicenseSelector component ตรงนี้ */}
          <LicenseSelector onLicenseChange={handleLicenseChange} />
        </div>
      )}

      {/* Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <div className="flex gap-2 rounded-lg border p-1">
          {["7", "30", "90"].map((dr) => (
            <button
              key={dr}
              onClick={() => handleTimeframeChange(dr)}
              disabled={isRefetching}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                dateRange === dr
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              } ${isRefetching ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {dr === "7"
                ? t("timeframes.7d")
                : dr === "30"
                  ? t("timeframes.30d")
                  : t("timeframes.90d")}
            </button>
          ))}
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t("kpis.activeStudents.title")}
          value={overview?.summary?.activeStudents || 0}
          description={timeframeLabel}
          icon={Users}
          tooltip={t("kpis.activeStudents.tooltip")}
          dataSource={t("kpis.dataSource.userActivity")}
        />
        <KPICard
          title={t("kpis.activeTeachers.title")}
          value={overview?.summary?.activeTeachers || 0}
          description={t("kpis.activeTeachers.description", {
            total: overview?.summary?.totalTeachers || 0,
          })}
          icon={GraduationCap}
          tooltip={t("kpis.activeTeachers.tooltip")}
          dataSource={t("kpis.dataSource.userActivity")}
        />
        <KPICard
          title={t("kpis.activeClassrooms.title")}
          value={overview?.summary?.activeClassrooms || 0}
          description={t("kpis.activeClassrooms.description")}
          icon={BookOpen}
          tooltip={t("kpis.activeClassrooms.tooltip")}
          dataSource={t("kpis.dataSource.classroomActivity")}
        />
        <KPICard
          title={t("kpis.readingSessions.title")}
          value={overview?.summary?.totalReadingSessions?.toLocaleString() || 0}
          description={t("kpis.readingSessions.description")}
          icon={Activity}
          tooltip={t("kpis.readingSessions.tooltip")}
          dataSource={t("kpis.dataSource.lessonRecords")}
        />
      </div>
      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title={t("kpis.totalXp.title")}
          value={
            overview?.recentActivity?.readingSessionsToday?.toLocaleString() ||
            0
          }
          description={t("kpis.totalXp.description")}
          icon={Target}
          tooltip={t("kpis.totalXp.tooltip")}
          dataSource={t("kpis.dataSource.lessonRecords")}
        />
        <KPICard
          title={t("kpis.newUsers.title")}
          value={overview?.recentActivity?.newUsersToday || 0}
          description={t("kpis.newUsers.description")}
          icon={TrendingUp}
          tooltip={t("kpis.newUsers.tooltip")}
          dataSource={t("kpis.dataSource.userRegistration")}
        />
        <KPICard
          title={t("kpis.systemHealth.title")}
          value={overview?.systemHealth?.status === "healthy" ? "✓" : "⚠"}
          description={t("kpis.systemHealth.description", {
            status: overview?.systemHealth?.status || "unknown",
          })}
          icon={Zap}
          tooltip={t("kpis.systemHealth.tooltip")}
          dataSource={t("kpis.dataSource.systemMonitoring")}
          status={
            overview?.systemHealth?.status === "healthy" ? "success" : "warning"
          }
        />
      </div>
      {/* Main Widgets Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Adoption Widget */}
        <AdoptionWidget
          schoolId={effectiveLicenseId as string}
          dateRange={dateRange}
          // onDrillDown={handleDrillDownToLevel}
        />

        {/* Alert Center */}
        <AlertCenter
          licenseId={effectiveLicenseId as string}
          dateRange={dateRange}
        />

        {/* Teacher Effectiveness and Activity Heatmap - Side by Side */}
        <TeacherEffectiveness
          licenseId={effectiveLicenseId as string}
          timeframe={dateRange}
        />

        <CompactActivityHeatmap
          entityIds={effectiveLicenseId as string}
          timeframe={dateRange}
        />

        {/* AI Insights and Smart Suggestions - Full Width Container */}
        <div className="lg:col-span-2">
          <AIInsights
            key={effectiveLicenseId}
            scope="license"
            contextId={effectiveLicenseId as string}
          />
        </div>
      </div>
    </div>
  );
}
