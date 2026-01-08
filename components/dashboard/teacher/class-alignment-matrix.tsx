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
import { MetricsAlignmentResponse } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchTeacherClassReportApi } from "@/utils/api-request";

export function ClassAlignmentMatrix() {
  const t = useTranslations("Components.classAlignmentMatrix");
  const params = useParams();
  const classroomId = params.classroomId;

  const { data, isPending, isError, error } = useQuery({
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
          <Skeleton className="h-48 w-full" />
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

  if (!data || !data.alignment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { alignment, summary } = data.alignment;
  const bucketCounts = alignment.buckets?.counts || { aligned: 0, above: 0 };
  const bucketPercentages = alignment.buckets?.percentages || {
    aligned: 0,
    above: 0,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("alignmentScore")}{" "}
          <Badge variant="outline">
            {Math.round(summary.alignmentScore)}/100
          </Badge>
          {" • "}
          {summary.totalStudents} {t("studentsWithActivity")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-green-50 p-4 text-center dark:bg-green-950">
            <div className="text-3xl font-bold text-green-600">
              {bucketCounts.aligned}
            </div>
            <div className="text-muted-foreground text-sm font-medium">
              {t("alignedLabel")}
            </div>
            <div className="mt-1 text-lg font-semibold text-green-600">
              {bucketPercentages.aligned}%
            </div>
          </div>
          <div className="rounded-lg border bg-amber-50 p-4 text-center dark:bg-amber-950">
            <div className="text-3xl font-bold text-amber-600">
              {bucketCounts.above}
            </div>
            <div className="text-muted-foreground text-sm font-medium">
              {t("aboveLabel")}
            </div>
            <div className="mt-1 text-lg font-semibold text-amber-600">
              {bucketPercentages.above}%
            </div>
          </div>
        </div>

        <div className="border-t pt-2">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("stats.averageLevel")}
              </span>
              <span className="font-medium">
                {summary.averageLevel.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("stats.modalLevel")}
              </span>
              <span className="font-medium">{summary.modalLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("stats.totalReadings")}
              </span>
              <span className="font-medium">{summary.totalReadings}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
