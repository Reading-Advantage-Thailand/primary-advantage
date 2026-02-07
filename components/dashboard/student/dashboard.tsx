"use client";

import React from "react";
import { XPVelocityWidget } from "./student-xp-velocity";
import { ETACard } from "@/components/dashboard/student/student-eta-card";
import { GenreEngagementWidget } from "@/components/dashboard/student/student-genre-engagement";
import { SRSHealthCard } from "@/components/dashboard/student/student-srs-health";
import { AICoachCard } from "@/components/dashboard/student/student-ai-coach";
import CEFRLevels from "@/components/dashboard/user-level-indicator";
import CompactActivityHeatmap from "@/components/dashboard/compact-activity-heatmap";
import ActivityTimeline from "@/components/dashboard/activity-timeline";
import { ActiveGoalsWidget } from "@/components/dashboard/student/active-goals-widget";
import { useRouter } from "next/navigation";
// import { VelocityMetrics } from "@/server/services/metrics/velocity-service";
// import { GenreMetricsResponse } from "@/server/services/metrics/genre-engagement-service";
import { useDashboardTelemetry } from "@/lib/dashboard-telemetry";
import { useTranslations } from "next-intl";
import { fetchStudentDashboardApi } from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGenreEngagementMetrics,
  useVelocityMetrics,
} from "@/hooks/use-velocity-metrics";
import { useCurrentUser } from "@/hooks/use-current-user";

// interface DashboardData {
//   velocity: VelocityMetrics | null;
//   genres: GenreMetricsResponse | null;
//   srsHealth: any | null;
//   aiInsights: any | null;
//   activityTimeline: any | null;
// }

export default function StudentDashboardContent() {
  const t = useTranslations("Student.Dashboard");
  const router = useRouter();
  const user = useCurrentUser();

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => fetchStudentDashboardApi(),
  });

  // Fetch velocity metrics separately
  const {
    data: velocityData,
    isPending: velocityPending,
    isError: velocityError,
    refetch: refetchVelocity,
  } = useVelocityMetrics();

  const {
    data: genresData,
    isPending: genresPending,
    isError: genresError,
    refetch: refetchGenres,
  } = useGenreEngagementMetrics({ studentId: user?.id });

  const handlePracticeFlashcards = () => {
    router.push("/student/vocabulary");
  };

  const handleSetGoal = () => {
    router.push("/student/goals");
  };

  // const handleGenreClick = (genre: string) => {
  //   router.push(`/student/articles?genre=${encodeURIComponent(genre)}`);
  // };

  if (isPending && velocityPending && genresPending) {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        <div className="col-span-2 space-y-4">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {/* Left Column - Main Widgets */}
      <div className="flex flex-col gap-4 md:col-span-2">
        {/* XP Velocity */}
        <XPVelocityWidget
          data={velocityData || null}
          loading={velocityPending}
          onRefresh={() => refetchVelocity()}
        />

        {/* ETA Card - conditionally rendered */}
        <ETACard
          data={velocityData || null}
          loading={velocityPending}
          onRefresh={() => refetchVelocity()}
        />

        {/* Genre Engagement */}
        <GenreEngagementWidget
          data={genresData || null}
          loading={genresPending}
          onRefresh={() => refetchGenres()}
          // onGenreClick={handleGenreClick}
        />

        {/* Activity Timeline */}
        <ActivityTimeline
          entityId={user?.id || ""}
          defaultTimeframe="30"
          showFilters
          showStats
        />
      </div>

      {/* Right Column - Side Widgets */}
      <div className="flex flex-col gap-4 md:col-span-1">
        {/* CEFR Level Indicator */}
        <CEFRLevels currentLevel={user?.cefrLevel || "A0"} />

        {/* Active Goals Widget */}
        <ActiveGoalsWidget />

        {/* SRS Health Card */}
        <SRSHealthCard onPracticeClick={handlePracticeFlashcards} />

        {/* Activity Heatmap */}
        <CompactActivityHeatmap entityIds={user?.id || ""} timeframe="90" />
      </div>
      <div className="flex flex-col gap-4 md:col-span-3">
        {/* AI Coach Card */}
        <AICoachCard
          // insights={data.aiInsights?.insights || null}
          metrics={
            velocityData
              ? {
                  currentXp: velocityData?.currentXp || 0,
                  velocity: velocityData?.emaVelocity || 0,
                  genresRead: genresData?.topGenres?.length || 0,
                  retentionRate:
                    data?.srsHealth?.metrics?.avgRetentionRate || 0,
                }
              : undefined
          }
          loading={!isPending}
          onRefresh={() => {}}
        />
      </div>
    </div>
  );
}
