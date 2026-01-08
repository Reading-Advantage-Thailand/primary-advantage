"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  fetchActiveUsersApi,
  fetchDailyActivityUsersApi,
} from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface ChartData {
  date: string;
  noOfUsers: number;
}

interface DailyUserData {
  date: string;
  users: ActiveUser[];
}

interface ModernActiveUsersProps {
  page?: string;
  licenseId?: string;
  dateRange?: string;
}

export default function ModernActiveUsers({
  page = "system",
  licenseId,
  dateRange = "30d",
}: ModernActiveUsersProps) {
  const t = useTranslations("Components.modernActiveUsers");
  const chartConfig = {
    noOfUsers: {
      label: t("labels.activeUsers"),
      color: "var(--primary)",
    },
  };
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [trend, setTrend] = useState<{
    value: number;
    direction: "up" | "down";
  } | null>(null);

  const {
    data: dailyActivityUsersData,
    isPending: isDailyActivityUsersPending,
    isError: isDailyActivityUsersError,
  } = useQuery({
    queryKey: ["daily-activity-users", licenseId],
    queryFn: () => fetchDailyActivityUsersApi(licenseId),
  });

  const {
    data: activeUsersData,
    isPending: isActiveUsersPending,
    isError: isActiveUsersError,
  } = useQuery({
    queryKey: ["active-users", dateRange],
    queryFn: () => fetchActiveUsersApi(dateRange),
  });

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       // Fetch chart data with caching and dateRange parameter
  //       const chartRes = await fetch(
  //         `/api/v1/activity/active-users?dateRange=${dateRange}`,
  //         {
  //           next: { revalidate: 300 }, // Cache for 5 minutes
  //         },
  //       );
  //       if (chartRes.ok) {
  //         const chartData = await chartRes.json();
  //         let dataToUse = chartData.total || [];

  //         // Filter data based on time range
  //         let days: number;
  //         if (dateRange === "7d") {
  //           days = 7;
  //         } else if (dateRange === "30d") {
  //           days = 30;
  //         } else if (dateRange === "90d") {
  //           days = 90;
  //         } else if (dateRange === "all") {
  //           // For 'all time', use all available data
  //           days = dataToUse.length > 0 ? dataToUse.length : 365;
  //         } else {
  //           days = 30; // default
  //         }

  //         // For 'all time', use data as-is if available, otherwise fill missing dates
  //         const filteredData =
  //           dateRange === "all" && dataToUse.length > 0
  //             ? dataToUse
  //             : fillMissingDates(dataToUse, days);
  //         setChartData(filteredData);

  //         // Calculate trend
  //         if (filteredData.length >= 2) {
  //           const latest =
  //             filteredData[filteredData.length - 1]?.noOfUsers || 0;
  //           const previous =
  //             filteredData[filteredData.length - 2]?.noOfUsers || 0;
  //           if (previous > 0) {
  //             const change = ((latest - previous) / previous) * 100;
  //             setTrend({
  //               value: Math.abs(change),
  //               direction: change >= 0 ? "up" : "down",
  //             });
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error fetching active users data:", error);
  //       // Set fallback data
  //       setChartData([]);
  //     }
  //   };

  //   fetchData();
  // }, [dateRange, page, licenseId]);

  // const fillMissingDates = (data: ChartData[], days: number): ChartData[] => {
  //   const now = new Date();
  //   const filledData: ChartData[] = [];
  //   const dataMap = new Map(data.map((item) => [item.date, item.noOfUsers]));

  //   for (let i = days - 1; i >= 0; i--) {
  //     const date = new Date();
  //     date.setDate(now.getDate() - i);
  //     const dateString = date.toISOString().split("T")[0];

  //     filledData.push({
  //       date: dateString,
  //       noOfUsers: dataMap.get(dateString) || 0,
  //     });
  //   }

  //   return filledData;
  // };

  // const totalActiveUsers = chartData.reduce(
  //   (sum, item) => sum + item.noOfUsers,
  //   0,
  // );

  if (isDailyActivityUsersPending) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>

        {/* Key metrics skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-8 w-8" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>

        {/* Chart/Content skeleton */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{t("today")}</p>
              <p className="text-2xl font-bold">{dailyActivityUsersData}</p>
            </div>
            <div className="bg-primary/10 rounded-full p-2">
              <Users className="text-primary h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">
                {dateRange === "7d"
                  ? t("avg.7d")
                  : dateRange === "30d"
                    ? t("avg.30d")
                    : dateRange === "90d"
                      ? t("avg.90d")
                      : t("avg.allTime")}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {activeUsersData && activeUsersData.chartData.length > 0
                    ? Math.round(
                        activeUsersData.chartData.reduce(
                          (sum: number, item: ChartData) =>
                            sum + item.noOfUsers,
                          0,
                        ) / activeUsersData.chartData.length,
                      )
                    : 0}
                </p>
                {activeUsersData && activeUsersData.trend && (
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      activeUsersData.trend.direction === "up"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {activeUsersData.trend.direction === "up" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{activeUsersData.trend.value.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-primary/10 rounded-full p-2">
              <Activity className="text-primary h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-lg border p-4">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">
            {t("title.activityTrend")}
          </span>
        </div>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={activeUsersData && activeUsersData.chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis axisLine={false} tickLine={false} />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background rounded-lg border p-3 shadow-md">
                      <p className="font-medium">
                        {new Date(label).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-primary text-sm">
                        {t("tooltip.activeUsers")}: {payload[0].value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="noOfUsers"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
