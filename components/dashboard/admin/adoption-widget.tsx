"use client";

import React, { useState } from "react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboardApi } from "@/utils/api-request";
import { Role } from "@/types/enum";
import { useCurrentUser } from "@/hooks/use-current-user";

interface AdoptionByLevel {
  level: string;
  cefrLevel: string;
  studentCount: number;
  activeCount: number;
  activeRate: number;
  averageXp: number;
}

interface AdoptionData {
  byGrade: AdoptionByLevel[];
  byCEFR: AdoptionByLevel[];
  summary: {
    totalStudents: number;
    activeStudents: number;
    overallActiveRate: number;
  };
}

interface AdoptionWidgetProps {
  schoolId?: string;
  dateRange?: string;
  onDrillDown?: (level: string, type: "grade" | "cefr") => void;
  className?: string;
}

export default function AdoptionWidget({
  schoolId,
  dateRange = "30",
  onDrillDown,
  className,
}: AdoptionWidgetProps) {
  const user = useCurrentUser();
  const [viewMode, setViewMode] = useState<"grade" | "cefr">("cefr");
  const t = useTranslations("Components.adoptionWidget");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin-dashboard", schoolId, dateRange],
    queryFn: () => fetchAdminDashboardApi(schoolId, dateRange),
    enabled:
      user?.role === Role.admin
        ? true
        : user?.role === Role.system && !!schoolId,
  });

  const currentData =
    viewMode === "grade"
      ? data?.adoptionData?.byGrade
      : data?.adoptionData?.byCEFR;

  // Get timeframe label (localized)
  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case "7d":
        return t("timeframe.7d");
      case "90d":
        return t("timeframe.90d");
      case "30d":
      default:
        return t("timeframe.30d");
    }
  };

  return (
    <WidgetShell
      title={t("title")}
      description={t("description", { mode: t(`modes.${viewMode}`) })}
      icon={GraduationCap}
      loading={isPending}
      error={isError ? error?.message : null}
      isEmpty={!currentData || currentData.length === 0}
      emptyMessage={t("empty")}
      onRefresh={refetch}
      className={className}
      headerAction={
        <div className="flex gap-1 rounded-md border p-1">
          <button
            className={cn(
              "rounded px-2 py-1 text-xs transition-colors",
              viewMode === "cefr" && "bg-primary text-primary-foreground",
            )}
            onClick={() => setViewMode("cefr")}
          >
            {t("view.cefr")}
          </button>
          <button
            className={cn(
              "rounded px-2 py-1 text-xs transition-colors",
              viewMode === "grade" && "bg-primary text-primary-foreground",
            )}
            onClick={() => setViewMode("grade")}
          >
            {t("view.grade")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {currentData?.map((level: AdoptionByLevel) => (
          <div
            key={level.level}
            className="hover:bg-accent/50 space-y-2 rounded-lg border p-3 transition-colors"
            onClick={() => onDrillDown?.(level.level, viewMode)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{level.level}</span>
                <Badge variant="outline" className="text-xs">
                  {level.cefrLevel}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {level.activeCount}/{level.studentCount}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    level.activeRate >= 80
                      ? "text-green-600 dark:text-green-400"
                      : level.activeRate >= 60
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400",
                  )}
                >
                  {level.activeRate}%
                </span>
              </div>
            </div>
            <Progress value={level.activeRate} className="h-2" />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>
                {t("item.activeStudents", { count: level.activeCount })}
              </span>
              <span>
                {t("item.avgXp", { xp: level.averageXp.toLocaleString() })}
              </span>
            </div>
          </div>
        ))}

        {data?.adoptionData && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t("summary.title")}</span>
              <span className="text-primary text-lg font-bold">
                {data.adoptionData.summary.overallActiveRate}%
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("summary.activeInTimeframe", {
                active: data.adoptionData.summary.activeStudents,
                total: data.adoptionData.summary.totalStudents,
                timeframe: getTimeframeLabel(dateRange),
              })}
            </p>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
