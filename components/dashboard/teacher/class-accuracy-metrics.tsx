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
import { ClassAccuracyResponse } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchTeacherClassReportApi } from "@/utils/api-request";
import { useParams } from "next/navigation";

export function ClassAccuracyMetrics() {
  const t = useTranslations("Components.classAccuracyMetrics");
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
          <p className="text-muted-foreground text-sm">
            {t("errorDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.accuracy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accuracy by Student & Type</CardTitle>
          <CardDescription>No accuracy data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { students, classAverages } = data.accuracy;
  const activeStudents = students.filter((s: any) => s.totalAttempts > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("descriptionPrefix")} • {activeStudents.length} {t("active")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Class averages */}
        <div className="bg-muted/50 grid grid-cols-3 gap-4 rounded-lg p-3 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold">
              {classAverages.mcqAccuracy}%
            </div>
            <div className="text-muted-foreground text-xs">{t("mcqAvg")}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {classAverages.openEndedAccuracy}%
            </div>
            <div className="text-muted-foreground text-xs">
              {t("openEndedAvg")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {classAverages.overallAccuracy}%
            </div>
            <div className="text-muted-foreground text-xs">
              {t("overallAvg")}
            </div>
          </div>
        </div>

        {/* Student table */}
        {activeStudents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("headers.student")}</TableHead>
                <TableHead className="text-right">{t("headers.mcq")}</TableHead>
                <TableHead className="text-right">
                  {t("headers.openEnded")}
                </TableHead>
                <TableHead className="text-right">
                  {t("headers.overall")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStudents.map((student: any) => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-medium">
                    {student.studentName}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span>{student.mcqAccuracy}%</span>
                      <span className="text-muted-foreground text-xs">
                        ({student.mcqAttempts})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span>{student.openEndedAccuracy}%</span>
                      <span className="text-muted-foreground text-xs">
                        ({student.openEndedAttempts})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-semibold ${
                        student.overallAccuracy >= 70
                          ? "text-green-600"
                          : student.overallAccuracy >= 50
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {student.overallAccuracy}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {t("noActivity")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
