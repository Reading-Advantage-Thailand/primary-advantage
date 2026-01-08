"use client";

import React from "react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

export interface GenreEngagementData {
  genre: string;
  cefrBucket: string;
  totalReads: number;
  recentReads30d: number;
  recentReads7d: number;
  totalQuizCompletions: number;
  recentQuizCompletions30d: number;
  totalXpEarned: number;
  recentXp30d: number;
  weightedEngagementScore: number;
  lastActivityDate: Date;
  firstActivityDate: Date;
  activeDays: number;
  totalActivities: number;
  dailyActivityRate: number;
}

export interface GenreRecommendation {
  genre: string;
  rationale: string;
  confidenceScore: number;
  cefrAppropriate: boolean;
  adjacencyWeight: number;
  recommendationType:
    | "high_engagement_similar"
    | "underexplored_adjacent"
    | "level_appropriate_new";
}

export interface GenreMetricsResponse {
  scope: "student" | "class" | "school";
  scopeId: string;
  timeframe: string;
  topGenres: GenreEngagementData[];
  recommendations: GenreRecommendation[];
  cefrDistribution: Record<string, number>;
  totalEngagementScore: number;
  calculatedAt: Date;
}

interface GenreEngagementWidgetProps {
  data: GenreMetricsResponse | null;
  loading?: boolean;
  onRefresh?: () => void;
  onGenreClick?: (genre: string) => void;
}

export function GenreEngagementWidget({
  data,
  loading = false,
  onRefresh,
  onGenreClick,
}: GenreEngagementWidgetProps) {
  const t = useTranslations("Student.Dashboard.genreEngagement");
  const topGenres = data?.topGenres?.slice(0, 5) || [];
  const recommendations = data?.recommendations?.slice(0, 3) || [];

  return (
    <WidgetShell
      title={t("title")}
      description={t("description")}
      icon={BookOpen}
      loading={loading}
      isEmpty={!loading && topGenres.length === 0}
      emptyMessage={t("emptyMessage")}
      onRefresh={onRefresh}
      telemetryId="student.genre_engagement"
    >
      <div className="space-y-6">
        {/* Top Genres */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">{t("yourTopGenres")}</h4>
          <div className="space-y-3">
            {topGenres.map((genre, index) => (
              <div key={genre.genre} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">
                      #{index + 1}
                    </span>
                    <button
                      onClick={() => onGenreClick?.(genre.genre)}
                      className="font-medium hover:underline"
                    >
                      {genre.genre}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {genre.totalReads} {t("reads")}
                    </span>
                    {genre.cefrBucket && (
                      <Badge variant="outline" className="text-xs">
                        {genre.cefrBucket}
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress
                  value={
                    (genre.totalReads /
                      Math.max(...topGenres.map((g) => g.totalReads))) *
                    100
                  }
                  className="h-2"
                />
                {genre.weightedEngagementScore && (
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3 w-3" />
                    <span>
                      {t("score")} {genre.weightedEngagementScore.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary h-4 w-4" />
              <h4 className="text-sm font-medium">{t("recommendedForYou")}</h4>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <Card key={index} className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">{rec.genre}</h5>
                        <Badge
                          variant={
                            rec.confidenceScore > 0.8
                              ? "default"
                              : rec.confidenceScore > 0.5
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {rec.recommendationType}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {rec.rationale}
                      </p>
                      {rec.cefrAppropriate && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {t("cefrAppropriate")}
                          </span>
                          <Badge variant="outline">✓</Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {data && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {data.topGenres?.length || 0}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("genresRead")}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.topGenres?.reduce((sum, g) => sum + g.totalReads, 0)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("totalReads")}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.totalEngagementScore?.toFixed(0) || 0}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("totalScore")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
