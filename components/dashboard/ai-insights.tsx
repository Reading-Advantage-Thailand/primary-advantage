"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Users,
  BookOpen,
  Zap,
  ArrowRight,
  Sparkles,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AIInsight } from "@/types/dashboard";
import { fetchAISummaryApi } from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";

interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "performance" | "engagement" | "content" | "user-experience";
  estimatedImpact: string;
  actions: string[];
}

interface AIInsightsProps {
  className?: string;
  scope?: "student" | "teacher" | "classroom" | "license" | "system";
  contextId?: string; // userId, classroomId, or licenseId
}

export default function AIInsights({
  className,
  scope,
  contextId,
}: AIInsightsProps) {
  const t = useTranslations("Components.aiInsights");
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const locale = useLocale();

  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["ai-insights", scope, contextId],
    queryFn: () => fetchAISummaryApi(scope, contextId),
  });

  // const fetchAIData = useCallback(
  //   async (forceRefresh = false) => {
  //     try {
  //       setLoading(true);
  //       setError(null);

  //       // Build query parameters
  //       const params = new URLSearchParams();
  //       if (scope) params.append("kind", scope);
  //       if (contextId) {
  //         if (scope === "classroom") params.append("classroomId", contextId);
  //         else if (scope === "license") params.append("licenseId", contextId);
  //         else params.append("userId", contextId);
  //       }
  //       if (forceRefresh) params.append("refresh", "true");

  //       // Fetch AI summary data from the API
  //       const response = await fetch(`/api/v1/ai/summary?${params.toString()}`);

  //       if (!response.ok) {
  //         throw new Error("Failed to fetch AI insights");
  //       }

  //       const data = await response.json();

  //       // Use insights from API response
  //       setInsights(data.insights || []);

  //       // Generate smart suggestions based on insights with scope-aware action items
  //       const getActionItems = (scope?: string) => {
  //         if (scope === "student") {
  //           return [
  //             "Review your progress",
  //             "Set personal goals",
  //             "Practice regularly",
  //             "Track your improvement",
  //           ];
  //         } else if (scope === "teacher") {
  //           return [
  //             "Review class performance",
  //             "Adjust teaching strategies",
  //             "Provide targeted support",
  //             "Monitor student progress",
  //           ];
  //         } else if (scope === "license" || scope === "system") {
  //           return [
  //             "Review the metrics",
  //             "Plan strategic actions",
  //             "Allocate resources effectively",
  //             "Monitor implementation",
  //           ];
  //         }
  //         return [
  //           "Review the recommendation",
  //           "Plan next steps",
  //           "Take action",
  //           "Monitor results",
  //         ];
  //       };

  //       const generatedSuggestions: SmartSuggestion[] = data.insights
  //         .filter((insight: AIInsight) => insight.type === "recommendation")
  //         .slice(0, 3)
  //         .map((insight: AIInsight, idx: number) => ({
  //           id: `suggestion-${idx}`,
  //           title: insight.title,
  //           description: insight.description,
  //           priority: insight.priority,
  //           category: "performance",
  //           estimatedImpact: "Data-driven improvement",
  //           actions: getActionItems(scope),
  //         }));

  //       setSuggestions(generatedSuggestions);
  //     } catch (err) {
  //       console.error("Error fetching AI insights:", err);
  //       setError(
  //         err instanceof Error ? err.message : "Failed to load AI insights",
  //       );
  //     } finally {
  //       setLoading(false);
  //     }
  //   },
  //   [scope, contextId],
  // );

  // useEffect(() => {
  //   fetchAIData();
  // }, [fetchAIData]);

  const handleDismiss = async (insightId: string) => {
    try {
      const response = await fetch("/api/v1/ai/insights/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId }),
      });

      if (!response.ok) throw new Error("Failed to dismiss insight");

      // Remove from UI
      setInsights(insights.filter((i) => i.id !== insightId));

      toast(t("toast.dismiss.title"), {
        description: t("toast.dismiss.description"),
      });
    } catch (err) {
      toast.error(t("toast.dismissError.title"), {
        description: t("toast.dismissError.description"),
        richColors: true,
      });
    }
  };

  const handleMarkAction = async (insightId: string) => {
    try {
      const response = await fetch("/api/v1/ai/insights/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId }),
      });

      if (!response.ok) throw new Error("Failed to mark action");

      toast(t("toast.actionRecorded.title"), {
        description: t("toast.actionRecorded.description"),
      });
    } catch (err) {
      toast.error(t("toast.actionError.title"), {
        description: t("toast.actionError.description"),
        richColors: true,
      });
    }
  };

  const handleRefresh = async () => {
    // await fetchAIData(true);
    toast(t("toast.refreshed.title"), {
      description: t("toast.refreshed.description"),
    });
  };

  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "trend":
        return TrendingUp;
      case "alert":
        return AlertTriangle;
      case "recommendation":
        return Lightbulb;
      case "achievement":
        return Target;
      default:
        return Brain;
    }
  };

  const getInsightColor = (type: AIInsight["type"]) => {
    switch (type) {
      case "trend":
        return "text-green-600";
      case "alert":
        return "text-orange-600";
      case "recommendation":
        return "text-blue-600";
      case "achievement":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "engagement":
        return Users;
      case "performance":
        return TrendingUp;
      case "content":
        return BookOpen;
      case "user-experience":
        return Sparkles;
      default:
        return Zap;
    }
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`grid gap-6 lg:grid-cols-2 ${className}`}>
      {/* AI Insights - Redesigned with compact cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle>{t("insights.title")}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <CardDescription>{t("insights.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {data?.insights?.length === 0 && !isPending && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {t("insights.empty")}
              </p>
            )}
            {data?.insights?.map((insight: any, index: number) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <div
                  key={index}
                  className="group relative flex items-start gap-3 rounded-lg border p-3 transition-all duration-200 hover:shadow-md"
                >
                  {/* Icon with colored background */}
                  <div
                    className={`rounded-lg p-2 ${getInsightColor(insight.type).replace("text-", "bg-").replace("-600", "-100")} dark:bg-opacity-20`}
                  >
                    <Icon
                      className={`h-4 w-4 ${getInsightColor(insight.type)}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Title and badges */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm leading-tight font-medium">
                        {insight.title[locale as "th" | "cn" | "tw" | "vi"] ||
                          insight.title.en}
                      </h4>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {Math.round(insight.confidence * 100)}%
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {insight.description[
                        locale as "th" | "cn" | "tw" | "vi"
                      ] || insight.description.en}
                    </p>

                    {/* Footer: Type, Priority, Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {insight.type}
                      </Badge>
                      <Badge
                        className={`text-xs ${getPriorityColor(insight.priority)}`}
                        variant="secondary"
                      >
                        {insight.priority}
                      </Badge>
                      <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDismiss(insight.id)}
                        >
                          {t("actions.done")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Smart Suggestions - Redesigned with compact layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            {t("suggestions.title")}
          </CardTitle>
          <CardDescription>{t("suggestions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.suggestions?.length === 0 && !isPending && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {t("suggestions.empty")}
              </p>
            )}
            {data?.suggestions?.map((data: any) => {
              const CategoryIcon = getCategoryIcon(data.category);
              return (
                <div
                  key={data.id}
                  className="group space-y-2 rounded-lg border p-3 transition-all duration-200 hover:shadow-md"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <CategoryIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                      <h4 className="truncate text-sm font-medium">
                        {data.title[locale as "th" | "cn" | "tw" | "vi"] ||
                          data.title.en}
                      </h4>
                    </div>
                    <Badge
                      className={`shrink-0 text-xs ${getPriorityColor(data.priority)}`}
                      variant="secondary"
                    >
                      {data.priority}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {data.description[locale as "th" | "cn" | "tw" | "vi"] ||
                      data.description.en}
                  </p>

                  {/* Impact */}
                  <div className="flex items-center gap-2 text-xs">
                    <Target className="h-3 w-3 text-green-600" />
                    <span className="text-muted-foreground">
                      {t("suggestions.impact")}
                    </span>
                    <span className="font-medium text-green-600">
                      {data.estimatedImpact}
                    </span>
                  </div>

                  {/* Action Items - Collapsible on small screens */}
                  <details className="group/details">
                    <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs font-medium">
                      <ArrowRight className="h-3 w-3 transition-transform group-open/details:rotate-90" />
                      {t("suggestions.actionItems", {
                        count: data.actions.length,
                      })}
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {data.actions.map((action: any, index: number) => (
                        <li
                          key={index}
                          className="text-muted-foreground flex items-start gap-2 text-xs"
                        >
                          <div className="bg-muted-foreground mt-1.5 h-1 w-1 shrink-0 rounded-full" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
