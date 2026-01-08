"use client";

import React, { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { MetricsActivityResponse } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { fetchTeacherClassHeatmapApi } from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";

interface ClassActivityHeatmapProps {
  expanded?: boolean;
  onSeeDetail?: () => void;
}

export function ClassActivityHeatmap({
  expanded = false,
  onSeeDetail,
}: ClassActivityHeatmapProps) {
  const t = useTranslations("Components.classActivityHeatmap") as any;
  const params = useParams();
  const classroomId = params.classroomId;

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["teacher-class-heatmap", classroomId, expanded],
    queryFn: () => fetchTeacherClassHeatmapApi(classroomId as string, expanded),
  });

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription className="text-destructive">
            {error.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("error")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { dataPoints, summary } = data;

  // Find max sessions for scaling
  const maxSessions = Math.max(
    ...dataPoints.map((d: any) => d.readingSessions),
  );

  // Get data based on expanded state
  const daysToShow = expanded ? 365 : 120;
  const recentData = dataPoints.slice(-daysToShow);

  // Find peak day with session count
  const peakDayData = dataPoints.find((d: any) => d.date === summary.peakDay);
  const peakSessions = peakDayData?.readingSessions || 0;

  // Group data by weeks (7 days per column)
  const weeks: (typeof recentData)[] = [];
  for (let i = 0; i < recentData.length; i += 7) {
    weeks.push(recentData.slice(i, i + 7));
  }

  // Get color intensity based on activity level
  const getColor = (sessions: number) => {
    if (sessions === 0) return "bg-slate-100";
    const intensity = maxSessions > 0 ? sessions / maxSessions : 0;
    if (intensity > 0.75) return "bg-green-600";
    if (intensity > 0.5) return "bg-green-500";
    if (intensity > 0.25) return "bg-green-400";
    return "bg-green-300";
  };

  const weekdays = [
    t("dow.sun"),
    t("dow.mon"),
    t("dow.tue"),
    t("dow.wed"),
    t("dow.thu"),
    t("dow.fri"),
    t("dow.sat"),
  ];

  // Responsive sizes based on expanded state
  const cellSize = expanded ? "w-3.5 h-3.5" : "w-3 h-3";
  const gapSize = expanded ? "gap-1" : "gap-1";
  const legendSize = expanded ? "w-3.5 h-3.5" : "w-3 h-3";
  const legendGap = expanded ? "gap-1" : "gap-1";
  const fontSize = expanded ? "text-xs" : "text-[10px]";
  const labelHeight = expanded ? "h-3.5" : "h-3";
  const monthHeight = expanded ? "h-6" : "h-6";
  const containerPadding = expanded ? "px-2" : "px-2";

  return (
    <Card className={expanded ? "" : "overflow-hidden"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {t("title")}
              <span className="text-muted-foreground text-xs font-normal">
                ({expanded ? "365" : "120"} {t("days")})
              </span>
            </CardTitle>
            <CardDescription>
              {t("description", { days: expanded ? 365 : 120 })}
            </CardDescription>
          </div>
          {!expanded && onSeeDetail && (
            <Button variant="outline" size="sm" onClick={onSeeDetail}>
              {t("seeDetail")}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats - moved to top for non-expanded */}
        {!expanded && (
          <div className="bg-muted/30 grid grid-cols-3 gap-3 rounded-lg p-3">
            <div className="text-center">
              <div className="text-primary text-2xl font-bold">
                {summary.totalActiveUsers}
              </div>
              <div className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {t("stats.activeUsers")}
              </div>
            </div>
            <div className="border-border/50 border-x text-center">
              <div className="text-primary text-2xl font-bold">
                {summary.totalSessions}
              </div>
              <div className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {t("stats.totalActivity")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-primary text-lg font-bold">
                {new Date(summary.peakDay).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {t("stats.peakDay")} ({peakSessions})
              </div>
            </div>
          </div>
        )}

        {/* GitHub-style contribution grid */}
        <div
          className={`flex ${gapSize} overflow-x-auto pb-2 ${containerPadding}`}
        >
          {/* Day labels */}
          <div
            className={`flex flex-col ${gapSize} justify-start ${expanded ? "pt-6" : "pt-7"} pr-2`}
          >
            {weekdays.map((day, idx) => (
              <div
                key={day}
                className={`${labelHeight} ${fontSize} text-muted-foreground flex items-center leading-none ${idx % 2 === 0 ? "" : "invisible"}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className={`flex flex-col ${gapSize}`}>
              {/* Month label on first day of each month */}
              <div
                className={`${monthHeight} ${fontSize} text-muted-foreground flex items-end pb-1 leading-none font-medium`}
              >
                {weekIdx === 0 || new Date(week[0]?.date).getDate() <= 7
                  ? new Date(week[0]?.date).toLocaleDateString("en-US", {
                      month: "short",
                    })
                  : ""}
              </div>
              {week.map((day: any, dayIdx: number) => {
                const date = new Date(day.date);
                return (
                  <div
                    key={dayIdx}
                    className={`${cellSize} rounded ${getColor(day.readingSessions)} hover:ring-primary/50 cursor-pointer shadow-sm transition-all hover:scale-110 hover:ring-2 hover:ring-offset-1`}
                    title={`${date.toLocaleDateString()}: ${day.readingSessions} activities`}
                  />
                );
              })}
              {/* Fill empty cells if week is incomplete */}
              {Array.from({ length: 7 - week.length }).map((_, idx) => (
                <div key={`empty-${idx}`} className={cellSize} />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          className={`flex items-center justify-between ${fontSize} text-muted-foreground px-2 pt-2`}
        >
          <span className="font-medium">{t("legend.title")}</span>
          <div className="flex items-center gap-2">
            <span>{t("legend.less")}</span>
            <div className={`flex ${legendGap}`}>
              <div
                className={`${legendSize} rounded border border-slate-200 bg-slate-100 shadow-sm`}
              />
              <div className={`${legendSize} rounded bg-green-300 shadow-sm`} />
              <div className={`${legendSize} rounded bg-green-400 shadow-sm`} />
              <div className={`${legendSize} rounded bg-green-500 shadow-sm`} />
              <div className={`${legendSize} rounded bg-green-600 shadow-sm`} />
            </div>
            <span>{t("legend.more")}</span>
          </div>
        </div>

        {/* Top 5 Most Active Days - for non-expanded view */}
        {!expanded && (
          <div className="space-y-2">
            <h4 className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
              {t("topActiveDays")}
            </h4>
            <div className="grid gap-2">
              {dataPoints
                .filter((d: any) => d.readingSessions > 0)
                .sort((a: any, b: any) => b.readingSessions - a.readingSessions)
                .slice(0, 5)
                .map((day: any, index: number) => {
                  const date = new Date(day.date);
                  const intensity =
                    maxSessions > 0 ? day.readingSessions / maxSessions : 0;
                  let colorClass =
                    "bg-green-300/10 text-green-700 border-green-300/10";
                  if (intensity > 0.75)
                    colorClass =
                      "bg-green-600/10 text-green-700 border-green-600/20";
                  else if (intensity > 0.5)
                    colorClass =
                      "bg-green-500/10 text-green-600 border-green-500/20";
                  else if (intensity > 0.25)
                    colorClass =
                      "bg-green-450/10 text-green-600 border-green-400/20";

                  return (
                    <div
                      key={day.date}
                      className={`flex items-center justify-between rounded-lg border p-2.5 ${colorClass} transition-all hover:shadow-sm`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-background/50 flex h-6 w-6 items-center justify-center rounded-full border border-current/20">
                          <span className="text-xs font-bold">
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            {date.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {day.readingSessions}
                        </div>
                        <div className="text-muted-foreground text-[9px] uppercase">
                          {t("activities")}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Summary stats for expanded view */}
        {expanded && (
          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <div className="text-center">
              <div className="text-primary text-2xl font-bold">
                {summary.totalActiveUsers}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("stats.activeUsers")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-primary text-2xl font-bold">
                {summary.totalSessions}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("stats.totalActivity")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-primary text-2xl font-bold">
                {new Date(summary.peakDay).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                <span className="text-muted-foreground ml-1 text-base">
                  ({peakSessions})
                </span>
              </div>
              <div className="text-muted-foreground text-xs">
                {t("stats.peakDay")}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
