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
import { Progress } from "@/components/ui/progress";
import { MetricsGenresResponse } from "@/types/dashboard";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { fetchTeacherClassReportApi } from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";

export function ClassGenreEngagement() {
  const tc = useTranslations("Components.classGenreEngagement");
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

  if (!data.genreMetrics || data.genreMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
          <CardDescription>{tc("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { genres, summary } = data.genreMetrics;
  const topGenres = genres.slice(0, 8); // Show top 8 genres

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tc("title")}</CardTitle>
        <CardDescription>
          {tc("description", { mostPopular: summary.mostPopular })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topGenres.map((genre: any) => (
          <div key={genre.genre} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{genre.genre}</span>
              <div className="text-muted-foreground flex items-center gap-2">
                <span>
                  {genre.count} {tc("labels.books")}
                </span>
                <span>•</span>
                <span>
                  {genre.percentage.toFixed(1)}
                  {tc("labels.percentSuffix")}
                </span>
              </div>
            </div>
            <Progress value={genre.percentage} />
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                {tc("labels.avgLevel")}: {genre.averageLevel.toFixed(1)}
              </span>
              <span>
                {genre.totalXp} {tc("labels.xp")}
              </span>
            </div>
          </div>
        ))}

        {genres.length > 8 && (
          <div className="text-muted-foreground border-t pt-2 text-center text-sm">
            {tc("moreGenres", { count: genres.length - 8 })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
