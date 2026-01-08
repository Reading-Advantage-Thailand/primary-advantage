"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/kpi-card";
import {
  Users,
  BookOpen,
  TrendingUp,
  Target,
  Zap,
  Activity,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchTeacherClassReportApi } from "@/utils/api-request";

export function ClassDashboardKPIs() {
  const tc = useTranslations("Components.classDashboardKpis");
  const params = useParams();
  const classroomId = params.classroomId;

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["teacher-class-report", classroomId],
    queryFn: () => fetchTeacherClassReportApi(classroomId as string),
  });

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
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

  if (isError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {tc("errorTitle")}
          </CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // const { summary } = data;
  const activityRate =
    data.studentCount > 0
      ? Math.round(
          (data.statistics.students.activeIn30d / data.studentCount) * 100,
        )
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <KPICard
        title={tc("totalStudents.title")}
        value={data.studentCount}
        description={tc("totalStudents.description", {
          active: data?.statistics?.students?.activeIn7d,
        })}
        icon={Users}
        loading={false}
        status="info"
      />

      <KPICard
        title={tc("activeStudents.title")}
        value={data?.statistics?.students?.activeIn30d}
        description={tc("activeStudents.description", { rate: activityRate })}
        icon={Activity}
        loading={false}
        status={
          activityRate >= 70
            ? "success"
            : activityRate >= 40
              ? "warning"
              : "error"
        }
      />

      <KPICard
        title={tc("avgLevel.title")}
        value={data?.statistics?.averageLevel?.toFixed(1)}
        description={tc("avgLevel.description")}
        icon={Target}
        loading={false}
        status="info"
      />

      <KPICard
        title={tc("totalXp.title")}
        value={data?.statistics?.totalXpEarned?.toLocaleString()}
        description={tc("totalXp.description")}
        icon={Zap}
        loading={false}
        status="success"
      />

      <KPICard
        title={tc("activeAssignments.title")}
        value={data?.statistics?.assignments?.total}
        description={tc("activeAssignments.description")}
        icon={BookOpen}
        loading={false}
        status="info"
      />

      <KPICard
        title={tc("completed.title")}
        value={data?.statistics?.assignments?.completed}
        description={tc("completed.description")}
        icon={TrendingUp}
        loading={false}
        status="success"
      />
    </div>
  );
}
