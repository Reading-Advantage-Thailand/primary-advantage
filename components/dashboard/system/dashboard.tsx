"use client";

import React, { useState, useEffect, useCallback } from "react";
import MetricsCards from "@/components/dashboard/system/metrics-cards";
import ActivityCharts from "@/components/dashboard/system/activity-charts";
import AIInsights from "@/components/dashboard/ai-insights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Activity,
  Brain,
  Settings,
  Download,
  RefreshCw,
  Calendar,
} from "lucide-react";

// Modern redesigned components
import ModernLicenseUsage from "@/components/dashboard/system/modern-license-usage";
import ModernActiveUsers from "@/components/dashboard/system/modern-active-users";
import { useTranslations } from "next-intl";
import { fetchSystemDashboardApi } from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";

// Types for dashboard data
interface DashboardData {
  overview?: {
    totalSchools?: number;
    totalStudents?: number;
    totalTeachers?: number;
    totalArticles?: number;
  };
  activity?: {
    readingSessions?: number;
    completionRate?: string;
  };
  health?: {
    database?: string;
    databaseResponseTime?: string;
    apiResponse?: string;
    apiResponseTime?: string;
    errorRate?: string;
    uptime?: string;
    lastChecked?: string;
  };
  recentActivities?: Array<{
    id: string;
    type: string;
    userId: string;
    userName: string | null;
    userRole: string;
    targetId: string;
    completed: boolean;
    timestamp: string;
    details?: any;
  }>;
  errors?: Record<string, string>;
}

export default function SystemDashboard() {
  const t = useTranslations("System.Dashboard");
  const [dateRange, setDateRange] = useState("30");

  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["system-dashboard", dateRange],
    queryFn: () => fetchSystemDashboardApi(dateRange),
  });

  // Helper function to get badge color based on status
  const getHealthBadgeClass = (status: string) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("excellent") || statusLower.includes("fast")) {
      return "bg-emerald-600 dark:bg-emerald-500";
    } else if (statusLower.includes("good")) {
      return "bg-primary";
    } else if (statusLower.includes("slow") || statusLower.includes("medium")) {
      return "bg-amber-600 dark:bg-amber-500";
    } else if (statusLower.includes("error") || statusLower.includes("high")) {
      return "bg-red-600 dark:bg-red-500";
    } else if (statusLower.includes("low")) {
      return "bg-emerald-600 dark:bg-emerald-500";
    }
    return "bg-gray-500 dark:bg-gray-400";
  };

  // Helper function to format activity type
  const formatActivityType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Helper function to format timestamp to relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  // Helper function to get activity color
  const getActivityColor = (index: number) => {
    const colors = ["emerald", "blue", "amber", "violet", "rose"];
    return colors[index];
  };

  const handleExport = () => {
    // Export dashboard data
    const exportedData = {
      dateRange,
      data,
    };

    const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4">
      {/* Action Buttons */}
      <div className="flex items-center md:justify-end">
        <div className="flex items-center gap-2">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t("dateRange.7d")}</SelectItem>
                <SelectItem value="30">{t("dateRange.30d")}</SelectItem>
                <SelectItem value="90">{t("dateRange.90d")}</SelectItem>
                <SelectItem value="all">{t("dateRange.all")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <Button variant="outline" onClick={handleExport} disabled={!data}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t("export")}</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching || isPending}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {isRefetching ? t("refreshing") : t("refresh")}
            </span>
          </Button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="mt-4">
        {isPending ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>{t("loading")}</span>
            </div>
          </div>
        ) : data && Object.keys(data).length !== 0 ? (
          <div>
            {/* Metrics Overview */}
            <section className="mb-6">
              <MetricsCards dateRange={dateRange} />
              {isError && (
                <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-yellow-800">
                    {t("metricsUnavailableTitle")}
                  </h4>
                  <ul className="space-y-1 text-xs text-yellow-700">
                    {Object.entries(error).map(
                      ([key, error]) =>
                        error && (
                          <li key={key}>
                            • {key}: {String(error)}
                          </li>
                        ),
                    )}
                  </ul>
                </div>
              )}
            </section>

            {/* Main Dashboard Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  {t("tabs.overview")}
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="flex items-center gap-2"
                >
                  <Activity className="h-4 w-4" />
                  {t("tabs.activity")}
                </TabsTrigger>
                <TabsTrigger
                  value="insights"
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  {t("tabs.insights")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Key Metrics Stats - Redesigned */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="border-l-primary border-l-4 transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        {t("cards.totalSchools.title")}
                      </CardTitle>
                      <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                        <Settings className="text-primary h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-primary text-3xl font-bold">
                        {data?.overview?.totalSchools || "0"}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("cards.totalSchools.desc")}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-emerald-500 transition-shadow hover:shadow-md dark:border-l-emerald-400">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        {t("cards.totalUsers.title")}
                      </CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-400/10">
                        <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {(
                          (data?.overview?.totalStudents || 0) +
                          (data?.overview?.totalTeachers || 0)
                        ).toLocaleString()}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("cards.totalUsers.count", {
                          students:
                            data?.overview?.totalStudents?.toLocaleString() ||
                            "0",
                          teachers:
                            data?.overview?.totalTeachers?.toLocaleString() ||
                            "0",
                        })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-violet-500 transition-shadow hover:shadow-md dark:border-l-violet-400">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        {t("cards.totalArticles.title")}
                      </CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 dark:bg-violet-400/10">
                        <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                        {data?.overview?.totalArticles?.toLocaleString() || "0"}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("cards.totalArticles.desc")}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-amber-500 transition-shadow hover:shadow-md dark:border-l-amber-400">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        {t("cards.completionRate.title")}
                      </CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-400/10">
                        <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {data?.activity?.completionRate || "0%"}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("cards.completionRate.desc")}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Usage Analytics */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card className="transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                          <BarChart3 className="text-primary h-4 w-4" />
                        </div>
                        {t("licenseUsage.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("licenseUsage.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ModernLicenseUsage />
                    </CardContent>
                  </Card>

                  <Card className="transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10">
                          <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {t("activeUsers.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("activeUsers.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ModernActiveUsers page="system" dateRange={dateRange} />
                    </CardContent>
                  </Card>
                </div>

                {/* System Health & Recent Activity */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card className="transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10">
                          <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {t("systemHealth.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("systemHealth.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:border-emerald-400/20 dark:bg-emerald-400/5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
                            <span className="text-sm font-medium">
                              {t("systemHealth.database")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="default"
                              className={getHealthBadgeClass(
                                data?.health?.database || "excellent",
                              )}
                            >
                              {data?.health?.database ||
                                t("systemHealth.status.excellent")}
                            </Badge>
                            {data?.health?.databaseResponseTime && (
                              <span className="text-muted-foreground text-xs">
                                {data.health.databaseResponseTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-primary/5 border-primary/20 flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
                            <span className="text-sm font-medium">
                              {t("systemHealth.apiResponse")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="default"
                              className={getHealthBadgeClass(
                                data?.health?.apiResponse || "good",
                              )}
                            >
                              {data?.health?.apiResponse ||
                                t("systemHealth.status.good")}
                            </Badge>
                            {data?.health?.apiResponseTime && (
                              <span className="text-muted-foreground text-xs">
                                {data.health.apiResponseTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 dark:border-violet-400/20 dark:bg-violet-400/5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-violet-500 dark:bg-violet-400" />
                            <span className="text-sm font-medium">
                              {t("systemHealth.errorRate")}
                            </span>
                          </div>
                          <Badge
                            variant="default"
                            className={getHealthBadgeClass(
                              data?.health?.errorRate || "low",
                            )}
                          >
                            {t("systemHealth.status.low")}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 dark:border-amber-400/20 dark:bg-amber-400/5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500 dark:bg-amber-400" />
                            <span className="text-sm font-medium">
                              {t("systemHealth.uptime")}
                            </span>
                          </div>
                          <Badge
                            variant="default"
                            className="bg-emerald-600 dark:bg-emerald-500"
                          >
                            {data?.health?.uptime || "N/A"}
                          </Badge>
                        </div>
                        {data?.health?.lastChecked && (
                          <div className="border-muted border-t pt-2">
                            <p className="text-muted-foreground text-center text-xs">
                              Last checked:{" "}
                              {new Date(
                                data.health.lastChecked,
                              ).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                          <Activity className="text-primary h-4 w-4" />
                        </div>
                        {t("recentActivity.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("recentActivity.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data?.recentActivities &&
                        data.recentActivities.length > 0 ? (
                          data.recentActivities.map(
                            (activity: any, index: number) => {
                              const color = getActivityColor(index);

                              return (
                                <div
                                  key={activity.id}
                                  className={`flex items-start gap-4 rounded-lg p-3 hover:bg-${color}-500/5 dark:hover:bg-${color}-400/5 border border-transparent transition-colors hover:border-${color}-500/20 dark:hover:border-${color}-400/20`}
                                >
                                  <div className="mt-1 flex-shrink-0">
                                    <div
                                      className={`h-2 w-2 rounded-full bg-${color}-500 dark:bg-${color}-400`}
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">
                                      {activity.userName || "Unknown User"} -{" "}
                                      {formatActivityType(activity.type)}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                      {formatRelativeTime(activity.timestamp)}
                                    </p>
                                  </div>
                                  {activity.completed && (
                                    <div className="flex-shrink-0">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Completed
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )
                        ) : (
                          <div className="py-8 text-center">
                            <p className="text-muted-foreground text-sm">
                              No recent activities
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-6 space-y-6">
                <ActivityCharts dateRange={dateRange} />
              </TabsContent>

              <TabsContent value="insights" className="mt-6 space-y-6">
                <AIInsights scope="system" />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">
                {t("noData.title")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("noData.description")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
