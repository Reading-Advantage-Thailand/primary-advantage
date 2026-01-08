"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { MetricsVelocityResponse } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { fetchTeacherClassReportApi } from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";

export function ClassVelocityTable() {
  const tc = useTranslations("Components.classVelocityTable");
  const params = useParams();
  const classroomId = params.classroomId;

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["teacher-class-report", classroomId],
    queryFn: () => fetchTeacherClassReportApi(classroomId as string),
  });

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
          <CardDescription className="text-destructive">
            {error.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {tc("errorUnableToLoad")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data.velocity || data.velocity.dataPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
          <CardDescription>{tc("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // const { dataPoints, summary } = data;

  // // Check if there's any actual activity (not just empty data points)
  // const hasActivity = summary.totalArticles > 0;

  // if (!hasActivity) {
  //   return (
  //     <Card>
  //       <CardHeader>
  //         <CardTitle>{tc("title")}</CardTitle>
  //         <CardDescription>{tc("noActivity")}</CardDescription>
  //       </CardHeader>
  //       <CardContent>
  //         <p className="text-muted-foreground text-sm">
  //           {tc("noActivityDetails", {
  //             days:
  //               data.timeframe === "7d"
  //                 ? "7"
  //                 : data.timeframe === "30d"
  //                   ? "30"
  //                   : data.timeframe === "90d"
  //                     ? "90"
  //                     : "365",
  //           })}
  //         </p>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  // Calculate average from data points
  const recentPoints = data.velocity.dataPoints.slice(-7);
  const olderPoints = data.velocity.dataPoints.slice(
    0,
    Math.min(7, data.velocity.dataPoints.length - 7),
  );

  const recentAvg =
    recentPoints.reduce(
      (sum: number, p: { wordsRead: number }) => sum + p.wordsRead,
      0,
    ) / (recentPoints.length || 1);
  const olderAvg =
    olderPoints.length > 0
      ? olderPoints.reduce(
          (sum: number, p: { wordsRead: number }) => sum + p.wordsRead,
          0,
        ) / olderPoints.length
      : recentAvg;

  const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  // Calculate timeframe in days
  const timeframeDays =
    data.timeframe === "7d"
      ? 7
      : data.timeframe === "30d"
        ? 30
        : data.timeframe === "90d"
          ? 90
          : 365;
  const articlesPerDay = data.velocity.summary.totalArticles / timeframeDays;
  const articlesPerWeek = articlesPerDay * 7;
  const articlesPerMonth = articlesPerDay * 30;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tc("title")}</CardTitle>
        <CardDescription>{tc("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground text-sm">
              {articlesPerDay >= 1
                ? tc("labels.articlesPerDay")
                : tc("labels.articlesPerMonth")}
            </div>
            <div className="text-2xl font-bold">
              {articlesPerDay >= 1
                ? articlesPerDay.toFixed(1)
                : articlesPerMonth.toFixed(1)}
            </div>
            {articlesPerDay < 1 && articlesPerDay > 0 && (
              <div className="text-muted-foreground mt-1 text-xs">
                ({articlesPerWeek.toFixed(1)}/week)
              </div>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground text-sm">
              {tc("labels.trend")}
            </div>
            <div className="flex items-center space-x-2">
              {data.velocity.summary.trend === "up" ? (
                <>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-xl font-bold text-green-600">
                    {tc("trend.up")}
                  </span>
                </>
              ) : data.velocity.summary.trend === "down" ? (
                <>
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="text-xl font-bold text-red-600">
                    {tc("trend.down")}
                  </span>
                </>
              ) : (
                <span className="text-xl font-bold text-slate-600">
                  {tc("trend.stable")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t pt-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {tc("stats.totalArticles")}
            </span>
            <span className="font-medium">
              {data.velocity.summary.totalArticles}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {tc("stats.totalWords")}
            </span>
            <span className="font-medium">
              {data.velocity.summary.totalWords.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {tc("stats.totalTime")}
            </span>
            <span className="font-medium">
              {Math.round(data.velocity.summary.totalTime)} {tc("stats.min")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
