"use client";

import React from "react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale, useTranslations } from "next-intl";
import { fetchAISummaryApi } from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";

interface AIInsight {
  id: string;
  type: "trend" | "alert" | "recommendation" | "achievement";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  relatedMetrics?: string[];
}

interface AICoachCardProps {
  // insights: AIInsight[] | null;
  metrics?: {
    currentXp: number;
    velocity: number;
    genresRead: number;
    retentionRate: number;
  };
  loading?: boolean;
  onRefresh?: () => void;
}

export function AICoachCard({
  // insights,
  metrics,
  loading = false,
  onRefresh,
}: AICoachCardProps) {
  const t = useTranslations("Student.Dashboard.aiCoach");
  const locale = useLocale();
  const { user } = useCurrentUser();
  const getInsightIcon = (type: string) => {
    switch (type) {
      case "trend":
        return <TrendingUp className="h-4 w-4" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4" />;
      case "recommendation":
        return <Lightbulb className="h-4 w-4" />;
      case "achievement":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "trend":
        return "text-blue-600 bg-blue-100 dark:bg-blue-950";
      case "alert":
        return "text-red-600 bg-red-100 dark:bg-red-950";
      case "recommendation":
        return "text-purple-600 bg-purple-100 dark:bg-purple-950";
      case "achievement":
        return "text-green-600 bg-green-100 dark:bg-green-950";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-950";
    }
  };

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["ai-insights", "student", user?.id],
    queryFn: () => fetchAISummaryApi("student", user?.id),
  });

  const topInsights = data?.insights.slice(0, 3) || [];

  return (
    <WidgetShell
      title={t("title")}
      description={t("description")}
      icon={Sparkles}
      loading={isPending}
      isEmpty={!isPending && topInsights.length === 0}
      emptyMessage={t("emptyMessage")}
      onRefresh={onRefresh}
      telemetryId="student.ai_coach"
    >
      <div className="space-y-4">
        {/* Metric References */}
        {metrics && (
          <div className="bg-muted/50 border-border rounded-lg border p-3">
            <p className="text-muted-foreground mb-2 text-center text-xs">
              {t("basedOnMetrics")}
            </p>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <span className="font-medium">{metrics.currentXp}</span> XP
              </div>
              <div>
                <span className="font-medium">
                  {metrics.velocity.toFixed(1)}
                </span>{" "}
                {t("xpPerDay")}
              </div>
              <div>
                <span className="font-medium">{metrics.genresRead}</span> genres
              </div>
              <div>
                <span className="font-medium">
                  {(metrics.retentionRate * 100).toFixed(0)}%
                </span>{" "}
                {t("retention")}
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="space-y-3">
          {topInsights.map((insight: any, index: number) => (
            <Card
              key={index}
              className={`border-l-4 ${
                insight.priority === "high"
                  ? "border-l-red-500"
                  : insight.priority === "medium"
                    ? "border-l-yellow-500"
                    : "border-l-blue-500"
              }`}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-1 items-start gap-2">
                      <div
                        className={`rounded p-1 ${getInsightColor(insight.type)}`}
                      >
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h5 className="text-sm font-medium">
                          {insight.title[locale as "th" | "cn" | "tw" | "vi"] ||
                            insight.title.en}
                        </h5>
                        <p className="text-muted-foreground text-xs">
                          {insight.description[
                            locale as "th" | "cn" | "tw" | "vi"
                          ] || insight.description.en}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        insight.priority === "high"
                          ? "destructive"
                          : insight.priority === "medium"
                            ? "default"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {insight.priority.toLowerCase() === "critical"
                        ? insight.priority
                        : t(`priority.${insight.priority}`)}
                    </Badge>
                  </div>

                  {insight.relatedMetrics &&
                    insight.relatedMetrics.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 border-t pt-2">
                        <span className="text-muted-foreground text-xs">
                          {t("related")}
                        </span>
                        {insight.relatedMetrics.map((metric: any) => (
                          <Badge
                            key={metric}
                            variant="outline"
                            className="text-xs"
                          >
                            {metric}
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Coaching Info */}
        <div className="border-t pt-4">
          <p className="text-muted-foreground text-center text-xs">
            {t("refreshNotice")}
          </p>
        </div>
      </div>
    </WidgetShell>
  );
}
