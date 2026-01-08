"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  ActivityIcon,
  UsersIcon,
  BookOpenIcon,
  TargetIcon,
  ZapIcon,
  ClockIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchMetricsCardsApi } from "@/utils/api-request";

interface MetricData {
  title: string;
  value: string | number;
  description: string;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  icon: React.ComponentType<any>;
  color: string;
}

interface MetricsCardsProps {
  className?: string;
  dateRange?: string;
}

export default function MetricsCards({
  className,
  dateRange = "30",
}: MetricsCardsProps) {
  const t = useTranslations("Components.metricsCards");

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["metrics-cards", dateRange],
    queryFn: () => fetchMetricsCardsApi(dateRange),
  });

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {/* Total Sessions */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {t("totalSessions.title")}
          </CardTitle>
          <ActivityIcon className={`h-4 w-4 text-blue-600`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.activity?.totalSessions}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <CardDescription className="text-xs">
              {t("totalSessions.description")}
            </CardDescription>
            <Badge
              variant={
                data?.trends?.sessionsGrowth >= 0 ? "default" : "destructive"
              }
              className="text-xs"
            >
              {data?.trends?.sessionsGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(data?.trends?.sessionsGrowth)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {t("activeUsers.title")}
          </CardTitle>
          <UsersIcon className={`h-4 w-4 text-green-600`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.activity?.totalActiveUsers}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <CardDescription className="text-xs">
              {t("activeUsers.description")}
            </CardDescription>
            <Badge
              variant={
                data?.trends?.usersGrowth >= 0 ? "default" : "destructive"
              }
              className="text-xs"
            >
              {data?.trends?.usersGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(data?.trends?.usersGrowth)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Reading Sessions */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {t("readingSessions.title")}
          </CardTitle>
          <BookOpenIcon className={`h-4 w-4 text-purple-600`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.activity?.totalSessions}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <CardDescription className="text-xs">
              {t("readingSessions.description")}
            </CardDescription>
            <Badge
              variant={
                data?.trends?.sessionsGrowth >= 0 ? "default" : "destructive"
              }
              className="text-xs"
            >
              {data?.trends?.sessionsGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(data?.trends?.sessionsGrowth)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Alignment Score */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {t("alignmentScore.title")}
          </CardTitle>
          <TargetIcon className={`h-4 w-4 text-orange-600`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.alignment?.alignmentScore}%
          </div>
          <div className="mt-2 flex items-center justify-between">
            <CardDescription className="text-xs">
              {t("alignmentScore.description")}
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      {/* Learning Velocity */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {t("learningVelocity.title")}
          </CardTitle>
          <ZapIcon className={`h-4 w-4 text-yellow-600`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.velocity?.avgXpPerStudent30d} XP/student
          </div>
          <div className="mt-2 flex items-center justify-between">
            <CardDescription className="text-xs">
              {t("learningVelocity.description", { dateRange })}
            </CardDescription>
            <Badge
              variant={
                data?.trends?.velocityGrowth >= 0 ? "default" : "destructive"
              }
              className="text-xs"
            >
              {data?.trends?.velocityGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(data?.trends?.velocityGrowth)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Avg. Session Time */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {t("avgSessionTime.title")}
          </CardTitle>
          <ClockIcon className={`h-4 w-4 text-indigo-600`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.activity?.averageSessionLength}m
          </div>
          <div className="mt-2 flex items-center justify-between">
            <CardDescription className="text-xs">
              {t("avgSessionTime.description")}
            </CardDescription>
            <Badge
              variant={
                data?.trends?.sessionTimeGrowth >= 0 ? "default" : "destructive"
              }
              className="text-xs"
            >
              {data?.trends?.sessionTimeGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(data?.trends?.sessionTimeGrowth)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
