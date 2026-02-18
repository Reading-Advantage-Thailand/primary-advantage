"use client";

import React, { use, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Activity, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardHeatmapApi } from "@/utils/api-request";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Role } from "@/types/enum";
import { eachDayOfInterval, isSameDay, startOfWeek, subDays } from "date-fns";

interface ActivityData {
  date: string;
  count: number;
  level: number; // 0-4 for color intensity
}

interface CompactActivityHeatmapProps {
  entityIds?: string;
  timeframe?: string;
  className?: string;
}

/**
 * Helper: Generate all days in the timeframe with zero activity
 */
function generateEmptyDays(timeframe: string): ActivityData[] {
  const days = parseInt(timeframe, 10) || 90;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activityData: ActivityData[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    activityData.push({
      date: dateStr,
      count: 0,
      level: 0,
    });
  }

  return activityData;
}

/**
 * Helper: Map activity count to intensity level
 */
function getActivityLevel(count: number): number {
  if (count >= 10) return 4; // Darkest green
  if (count >= 6) return 3; // Dark green
  if (count >= 3) return 2; // Medium green
  if (count >= 1) return 1; // Light green
  return 0; // Gray/no activity
}

/**
 * Helper: Process heatmap buckets into activity data
 */
function processHeatmapData(
  buckets: any[],
  timeframe: string,
): {
  data: ActivityData[];
  stats: { total: number; peak: number; average: number };
} {
  // Step 1: Generate all days with zero activity
  const activityData = generateEmptyDays(timeframe);

  // Step 2: Aggregate activity counts by date
  const apiDataMap = new Map<string, number>();
  buckets.forEach((bucket: any) => {
    const currentCount = apiDataMap.get(bucket.date) || 0;
    apiDataMap.set(bucket.date, currentCount + (bucket.activityCount || 0));
  });

  // Step 3: Update days with API data
  activityData.forEach((item) => {
    const count = apiDataMap.get(item.date);
    if (count !== undefined) {
      item.count = count;
      item.level = getActivityLevel(count);
    }
  });

  // Step 4: Calculate stats
  const total = activityData.reduce((sum, d) => sum + d.count, 0);
  const peak = Math.max(...activityData.map((d) => d.count), 0);
  const average =
    activityData.length > 0 ? Math.round(total / activityData.length) : 0;

  return {
    data: activityData,
    stats: { total, peak, average },
  };
}

export default function CompactActivityHeatmap({
  entityIds,
  timeframe = "90",
  className,
}: CompactActivityHeatmapProps) {
  const t = useTranslations("Components.compactHeatmap");
  const { user } = useCurrentUser();
  const formatTime = useFormatter();

  const {
    data: dashboardData,
    isPending,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["activity-heatmap", entityIds, timeframe],
    queryFn: () => fetchDashboardHeatmapApi(entityIds, timeframe),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    enabled:
      user?.role === Role.student || user?.role === Role.admin
        ? true
        : user?.role === Role.system && !!entityIds,
  });

  // Process heatmap data from dashboard response
  const { data, stats } = useMemo(() => {
    if (!dashboardData?.buckets) {
      // Return empty state if no data
      const emptyData = generateEmptyDays(timeframe);
      return {
        data: emptyData,
        stats: { total: 0, peak: 0, average: 0 },
      };
    }

    return processHeatmapData(dashboardData.buckets, timeframe);
  }, [dashboardData, timeframe]);

  const getColorClass = (level: number) => {
    switch (level) {
      case 0:
        return "bg-muted hover:bg-muted/80";
      case 1:
        return "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50";
      case 2:
        return "bg-green-300 dark:bg-green-700/60 hover:bg-green-400 dark:hover:bg-green-700/80";
      case 3:
        return "bg-green-500 dark:bg-green-600/80 hover:bg-green-600 dark:hover:bg-green-600";
      case 4:
        return "bg-green-700 dark:bg-green-500 hover:bg-green-800 dark:hover:bg-green-400";
      default:
        return "bg-muted";
    }
  };

  const gridData = useMemo(() => {
    const today = new Date();
    // const daysToSubtract = timeframe === "90" ? 90 : 30;
    const daysToSubtract = parseInt(timeframe) || 90;
    const startDate = subDays(today, daysToSubtract);
    const startOfGrid = startOfWeek(startDate);
    const endOfGrid = today;

    const allDays = eachDayOfInterval({ start: startOfGrid, end: endOfGrid });
    const weeksData: {
      date: Date;
      count: number;
      level: number;
    }[][] = [];
    let currentWeek: {
      date: Date;
      count: number;
      level: number;
    }[] = [];

    // Map Data
    allDays.forEach((day) => {
      const found = data?.find((d) => isSameDay(d.date, day));
      currentWeek.push({
        date: day,
        count: found ? found.count : 0,
        level: found ? found.level : 0,
      });
      if (currentWeek.length === 7) {
        weeksData.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) weeksData.push(currentWeek);

    // Month Labels
    const monthLabels: { label: string; index: number }[] = [];
    let lastMonthStr = "";
    let lastIndex = -10;

    weeksData.forEach((week, index) => {
      const firstDayOfWeek = week[0].date;
      const monthStr = formatTime.dateTime(firstDayOfWeek, { month: "short" });
      const minGap = timeframe === "90" ? 1 : 2;

      if (monthStr !== lastMonthStr) {
        if (index - lastIndex > minGap) {
          monthLabels.push({ label: monthStr, index });
          lastMonthStr = monthStr;
          lastIndex = index;
        }
      }
    });

    return { weeks: weeksData, months: monthLabels };
  }, [data, timeframe]);

  const render7Days = () => (
    <div className="flex w-full items-end gap-2">
      {/* ตัดเอาแค่ 7 วันล่าสุด */}
      {gridData.weeks
        .flat()
        .slice(-7)
        .map((item, index: number) => (
          <div key={index} className="flex flex-1 flex-col items-center">
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "h-12 w-full rounded-lg shadow-sm transition-all hover:scale-110",
                      getColorClass(item.level),
                    )}
                  />
                </TooltipTrigger>

                <TooltipContent>
                  <p className="font-semibold">
                    {formatTime.dateTime(new Date(item.date), {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-muted-foreground font-medium">
                      {item.count}
                    </span>{" "}
                    {t("activities")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-muted-foreground text-sm">
              {formatTime.dateTime(new Date(item.date), {
                weekday: "short",
              })}
            </span>
          </div>
        ))}
    </div>
  );

  const renderActivityGrid = () => {
    const getDayLabels = () => {
      const startDate = new Date(2024, 0, 7);
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return formatTime.dateTime(date, { weekday: "short" });
      });
    };

    const DAYS = getDayLabels();
    const GAP_SIZE = 4;
    const blockSize = 16;

    return (
      <div className="flex w-full justify-center">
        <div
          className="mr-3 flex shrink-0 flex-col pt-[24px]"
          style={{ gap: `${GAP_SIZE}px` }}
        >
          {DAYS.map((day, index) => (
            <span
              key={index}
              className="text-muted-foreground flex w-[24px] items-center justify-end text-[10px]"
              style={{ height: `${blockSize}px` }}
            >
              {/* Show label only for Mon/Wed/Fri to reduce clutter if small, or all if big */}
              {blockSize > 15 || [1, 3, 5].includes(index) ? day : ""}
            </span>
          ))}
        </div>
        <div className="flex flex-col">
          {/* Month Labels */}
          <div className="text-muted-foreground relative mb-1 h-[20px] w-full text-xs">
            {gridData.months.map((m, i) => (
              <span
                key={i}
                className="absolute truncate font-medium"
                style={{ left: `${m.index * (blockSize + GAP_SIZE)}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Heatmap Grid */}
          <div className="flex" style={{ gap: `${GAP_SIZE}px` }}>
            {gridData.weeks.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className="flex flex-col"
                style={{ gap: `${GAP_SIZE}px` }}
              >
                {week.map((day, dayIndex) => {
                  const isFuture = day.date > new Date();
                  return (
                    <TooltipProvider key={dayIndex}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div
                            style={{ width: blockSize, height: blockSize }}
                            className={cn(
                              "rounded-[3px]",
                              isFuture
                                ? "opacity-0"
                                : cn(
                                    "cursor-pointer transition-all hover:opacity-80",
                                    getColorClass(day.level),
                                  ),
                            )}
                          />
                        </TooltipTrigger>
                        {!isFuture && (
                          <TooltipContent side="top">
                            <div className="text-center text-xs">
                              <p className="font-semibold">
                                {formatTime.dateTime(new Date(day.date), {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              <p className="text-muted-foreground">
                                <span className="text-muted-foreground font-medium">
                                  {day.count}
                                </span>{" "}
                                {t("activities")}
                              </p>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>{t("lastRange")}</span>
          <Badge variant="secondary" className="text-xs">
            {stats.total.toLocaleString()} {t("activities")}
          </Badge>
        </CardDescription>
      </CardHeader>
      {isPending ? (
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </CardContent>
      ) : (
        <CardContent className="space-y-4">
          {/* Stats - Compact horizontal layout */}
          <div className="flex items-center justify-center gap-10 border-b pb-4 md:gap-2 lg:gap-10">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t("stats.total")}
                </p>
                <p className="text-lg font-bold">
                  {stats.total.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/20">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t("stats.peakDay")}
                </p>
                <p className="text-lg font-bold">{stats.peak}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/20">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t("stats.dailyAvg")}
                </p>
                <p className="text-lg font-bold">{stats.average}</p>
              </div>
            </div>
          </div>

          {/* Heatmap - Full width */}
          <div className="space-y-3">
            {/* Month labels */}
            {timeframe === "7" ? render7Days() : renderActivityGrid()}

            {/* Legend */}
            <div className="flex items-center justify-between border-t pt-2">
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>{t("legend.less")}</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "h-3 w-3 rounded-[3px]",
                        getColorClass(level),
                      )}
                    />
                  ))}
                </div>
                <span>{t("legend.more")}</span>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("hoverForDetails")}
              </p>
            </div>

            {/* Top Activity Dates */}
            <div className="mt-4 border-t pt-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-green-600" />
                {t("topActivityDates")}
              </h4>
              <div className="space-y-2">
                {[...data]
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 3)
                  .map((item, index) => (
                    <div
                      key={item.date}
                      className="bg-muted/50 hover:bg-muted flex items-center justify-between rounded-lg p-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {formatTime.dateTime(new Date(item.date), {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatTime.dateTime(new Date(item.date), {
                              weekday: "long",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {item.count}
                        </Badge>
                        <div
                          className={cn(
                            "h-3 w-3 rounded-[3px]",
                            getColorClass(item.level),
                          )}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
