"use client";

import React, { useState } from "react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GraduationCap, TrendingUp, Users, Award } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboardApi } from "@/utils/api-request";
import { TeacherMetric } from "@/types/dashboard";
import { Role } from "@/types/enum";
import { useCurrentUser } from "@/hooks/use-current-user";

interface TeacherMetrics {
  teacherId: string;
  teacherName: string;
  studentCount: number;
  activeStudents: number;
  averageProgress: number; // Average level gain
  engagementRate: number; // % of students active
  averageAccuracy: number;
  classCount: number;
}

interface TeacherEffectivenessProps {
  licenseId?: string;
  timeframe?: string;
  onTeacherClick?: (teacherId: string) => void;
  className?: string;
}

export default function TeacherEffectiveness({
  licenseId,
  timeframe = "30",
  onTeacherClick,
  className,
}: TeacherEffectivenessProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherMetrics | null>(
    null,
  );
  const user = useCurrentUser();
  const t = useTranslations("Admin.Dashboard.teacherEffectiveness");

  // Use TanStack Query to fetch admin dashboard data
  const {
    data,
    isPending,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["admin-dashboard", licenseId, timeframe],
    queryFn: () => fetchAdminDashboardApi(licenseId, timeframe),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    enabled:
      user?.role === Role.admin
        ? true
        : user?.role === Role.system && !!licenseId,
  });

  // Transform TeacherMetric to TeacherMetrics for compatibility
  const teachers: TeacherMetrics[] =
    data?.teacherEffectiveness?.teachers?.map((t: TeacherMetric) => ({
      teacherId: t.teacherId,
      teacherName: t.teacherName,
      studentCount: t.studentCount,
      activeStudents: t.activeStudents,
      averageProgress: 0, // Not available yet
      engagementRate: t.engagementRate,
      averageAccuracy: 0, // Not available yet
      classCount: t.classroomCount,
    })) || [];

  const loading = isPending;
  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load teacher data"
    : null;

  const getPerformanceColor = (
    engagementRate: number,
    averageProgress: number,
  ) => {
    // Based on engagement rate only since we don't have progress data yet
    if (engagementRate >= 80) return "#22c55e"; // Green
    if (engagementRate >= 60) return "#eab308"; // Yellow
    return "#ef4444"; // Red
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background rounded-lg border p-3 shadow-lg">
          <p className="mb-2 font-semibold">{data.teacherName}</p>
          <div className="space-y-1 text-sm">
            <p>{t("tooltip.engagement", { rate: data.engagementRate })}</p>
            <p className="text-muted-foreground">
              {t("tooltip.activeStudents", {
                active: data.activeStudents,
                total: data.studentCount,
              })}
            </p>
            <p className="text-muted-foreground text-xs">
              {data.classCount}{" "}
              {t("tooltip.classroom", { count: data.classCount })}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Sort teachers by engagement rate for ranking
  const sortedTeachers = [...teachers].sort(
    (a, b) => b.engagementRate - a.engagementRate,
  );

  return (
    <WidgetShell
      title={t("title")}
      description={t("description")}
      icon={GraduationCap}
      loading={loading}
      error={error}
      isEmpty={teachers.length === 0}
      emptyMessage={t("emptyMessage")}
      onRefresh={() => refetch()}
      className={className}
    >
      <div className="space-y-4">
        {/* Scatter Chart - Engagement Rate */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="category"
                dataKey="teacherName"
                name="Teacher"
                angle={-45}
                textAnchor="end"
                height={80}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="engagementRate"
                name="Engagement Rate"
                label={{
                  value: "Engagement Rate (%)",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[0, 100]}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter
                data={teachers}
                onClick={(data) => {
                  setSelectedTeacher(data);
                  onTeacherClick?.(data.teacherId);
                }}
                className="cursor-pointer"
              >
                {teachers.map((teacher, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getPerformanceColor(teacher.engagementRate, 0)}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>{t("legend.excellent")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span>{t("legend.good")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>{t("legend.needsSupport")}</span>
          </div>
        </div>

        {/* Teacher List */}
        <div className="space-y-2">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Award className="h-4 w-4 text-amber-600" />
            {t("topTeacher")}
          </h4>
          {/* Top 3 Teachers */}
          {sortedTeachers.slice(0, 3).map((teacher, index) => {
            const medals = ["🥇", "🥈", "🥉"];

            return (
              <div
                key={teacher.teacherId}
                className={cn(
                  "hover:bg-accent relative flex cursor-pointer items-center justify-between overflow-hidden rounded-lg border-2 p-3 transition-colors",
                  `bg-opacity-5 bg-gradient-to-r`,
                )}
                onClick={() => {
                  setSelectedTeacher(teacher);
                  onTeacherClick?.(teacher.teacherId);
                }}
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className="text-2xl">{medals[index]}</div>
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      teacher.engagementRate >= 80
                        ? "bg-green-500"
                        : teacher.engagementRate >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500",
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold">
                      {teacher.teacherName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {teacher.activeStudents}/{teacher.studentCount}{" "}
                      {t("activeLabel")} • {teacher.classCount}{" "}
                      {t("classroomLabel", { count: teacher.classCount })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{teacher.engagementRate}%</p>
                  <p className="text-muted-foreground text-xs">
                    {t("engagement")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetShell>
  );
}
