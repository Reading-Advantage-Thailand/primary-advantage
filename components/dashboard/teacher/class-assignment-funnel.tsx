"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { MetricsAssignmentsResponse } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchTeacherClassReportApi } from "@/utils/api-request";

interface ClassAssignmentFunnelProps {
  detailed?: boolean;
  onSeeDetail?: () => void;
}

export function ClassAssignmentFunnel({
  detailed = false,
  onSeeDetail,
}: ClassAssignmentFunnelProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "high" | "atRisk" | "stale">(
    "all",
  );
  const t = useTranslations("Components.classAssignmentFunnel");
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
          <Skeleton className="h-4 w-64" />
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
            {error?.message}
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

  const highCompletionAssignments =
    data.statistics.assignments.assignmentMetrics.filter(
      (a: any) => a.completionRate >= 80,
    ).length;
  const atRiskAssignments =
    data.statistics.assignments.assignmentMetrics.filter(
      (a: any) => a.completionRate < 70 && a.assigned > 0,
    ).length;
  const staleAssignments = data.statistics.assignments.assignmentMetrics.filter(
    (a: any) => a.notStarted === a.assigned && a.assigned > 0,
  ).length;

  // Filter assignments based on selected filter
  const filteredAssignments =
    data.statistics.assignments.assignmentMetrics.filter((assignment: any) => {
      if (filter === "high") {
        return assignment.completionRate >= 80;
      } else if (filter === "atRisk") {
        return assignment.completionRate < 70 && assignment.assigned > 0;
      } else if (filter === "stale") {
        return (
          assignment.notStarted === assignment.assigned &&
          assignment.assigned > 0
        );
      }
      return true; // 'all'
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {!detailed && onSeeDetail && (
            <Button variant="outline" size="sm" onClick={onSeeDetail}>
              {t("seeDetail")}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">
              {t("overallCompletion")}
            </span>
          </div>
          <span className="text-2xl font-bold">
            {data.statistics.assignments.averageCompletionRate}%
          </span>
        </div>

        {/* Show filter buttons only in detailed view */}
        {detailed && (
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setFilter(filter === "high" ? "all" : "high")}
              className={`rounded-lg border p-3 text-center transition-all ${
                filter === "high"
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "hover:bg-muted border-transparent"
              }`}
            >
              <div className="text-2xl font-bold text-green-600">
                {highCompletionAssignments}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("highCompletion")}
              </div>
            </button>
            <button
              onClick={() => setFilter(filter === "atRisk" ? "all" : "atRisk")}
              className={`rounded-lg border p-3 text-center transition-all ${
                filter === "atRisk"
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950"
                  : "hover:bg-muted border-transparent"
              }`}
            >
              <div className="text-2xl font-bold text-amber-600">
                {atRiskAssignments}
              </div>
              <div className="text-muted-foreground text-xs">{t("atRisk")}</div>
            </button>
            <button
              onClick={() => setFilter(filter === "stale" ? "all" : "stale")}
              className={`rounded-lg border p-3 text-center transition-all ${
                filter === "stale"
                  ? "border-slate-500 bg-slate-50 dark:bg-slate-950"
                  : "hover:bg-muted border-transparent"
              }`}
            >
              <div className="text-2xl font-bold text-slate-600">
                {staleAssignments}
              </div>
              <div className="text-muted-foreground text-xs">{t("stale")}</div>
            </button>
          </div>
        )}

        {/* Show simple stats in summary view */}
        {!detailed && (
          <div className="grid grid-cols-3 gap-4 border-t pt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {highCompletionAssignments}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("highCompletion")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {atRiskAssignments}
              </div>
              <div className="text-muted-foreground text-xs">{t("atRisk")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600">
                {staleAssignments}
              </div>
              <div className="text-muted-foreground text-xs">{t("stale")}</div>
            </div>
          </div>
        )}

        {detailed && filteredAssignments.length > 0 && (
          <div className="text-muted-foreground pb-2 text-xs">
            {t("showing", { count: filteredAssignments.length })}
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="ml-2 text-blue-600 hover:underline"
              >
                ({t("clearFilter")})
              </button>
            )}
          </div>
        )}

        {!detailed && filteredAssignments.length > 0 && (
          <div className="space-y-3">
            {filteredAssignments.slice(0, 5).map((assignment: any) => {
              const completed = assignment.completed;
              const total = assignment.assigned;
              const progress = assignment.completionRate;

              return (
                <div key={assignment.assignmentId} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1 truncate font-medium">
                      {assignment.name}
                    </span>
                    <span className="whitespace-nowrap">
                      {completed}/{total}
                    </span>
                  </div>
                  <Progress value={progress} />
                </div>
              );
            })}
          </div>
        )}

        {detailed && filteredAssignments.length > 0 && (
          <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
            {filteredAssignments.map((assignment: any) => {
              const completed = assignment.completed;
              const total = assignment.assigned;
              const inProgress = assignment.inProgress;
              const notStarted = assignment.notStarted;
              const progress = assignment.completionRate;
              const isAtRisk =
                assignment.completionRate < 70 && assignment.assigned > 0;
              const isStale = notStarted === total && total > 0;

              return (
                <div key={assignment.assignmentId} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1 truncate font-medium">
                      {assignment.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="whitespace-nowrap">
                        {completed}/{total}
                      </span>
                      {isStale && (
                        <Badge variant="secondary" className="text-xs">
                          {t("notStarted")}
                        </Badge>
                      )}
                      {isAtRisk && (
                        <Badge
                          variant="outline"
                          className="text-xs text-amber-600"
                        >
                          At Risk
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() =>
                          router.push(
                            `/teacher/assignments/${assignment.assignmentId}`,
                          )
                        }
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={progress} />
                </div>
              );
            })}
          </div>
        )}

        {atRiskAssignments > 0 && filter === "all" && (
          <div className="flex items-center space-x-2 border-t pt-4 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {atRiskAssignments}{" "}
              {atRiskAssignments > 1
                ? t("needAttentionPlural")
                : t("needAttention")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
