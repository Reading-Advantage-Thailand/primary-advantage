"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClassDashboardKPIs } from "./class-dashboard-kpis";
import { ClassAssignmentFunnel } from "./class-assignment-funnel";
import { ClassAlignmentMatrix } from "./class-alignment-matrix";
import { ClassVelocityTable } from "./class-velocity-table";
import { ClassActivityHeatmap } from "./class-activity-heatmap";
import { ClassGenreEngagement } from "./class-genre-engagement";
import { ClassAccuracyMetrics } from "./class-accuracy-metrics";
import AIInsights from "@/components/dashboard/ai-insights";
import { ClassBatchActions } from "./class-batch-actions";
import { ClassroomGoalsManagement } from "./class-goals-management";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Settings,
  Users,
  BookOpen,
  BarChart3,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchTeacherClassReportApi } from "@/utils/api-request";

export interface ClassDetailDashboardProps {
  classroomId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export function ClassDetailDashboard() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("Teacher.Dashboard.classDetail");
  const [activeTab, setActiveTab] = useState("overview");
  const classroomId = params.classroomId;

  const handleBack = () => {
    router.push("/th/teacher/dashboard");
  };

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["teacher-class-report", classroomId],
    queryFn: () => fetchTeacherClassReportApi(classroomId as string),
  });

  const handleExportCSV = async () => {
    // TODO: Implement CSV export
    try {
      const res = await fetch(
        `/api/v1/teacher/class/${classroomId}/export?format=csv`,
      );
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `class-${data?.classCode}-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {data?.className}
            </h1>
            <p className="text-muted-foreground">
              {t("classCodePrefix")}{" "}
              <span className="font-mono">{data?.classCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>
          {/* <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            {t("exportCSV")}
          </Button> */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/th/teacher/my-classes/${classroomId}/settings`)
            }
          >
            <Settings className="mr-2 h-4 w-4" />
            {t("settings")}
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <ClassDashboardKPIs />

      {/* AI Insights for this classroom */}
      <AIInsights scope="classroom" contextId={classroomId as string} />

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <BookOpen className="mr-2 h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="mr-2 h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="goals">
            <Target className="mr-2 h-4 w-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="alignment">
            <Target className="mr-2 h-4 w-4" />
            Alignment
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Zap className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ClassAssignmentFunnel
              onSeeDetail={() => setActiveTab("assignments")}
            />
            <ClassVelocityTable />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ClassGenreEngagement />
            <ClassActivityHeatmap
              onSeeDetail={() => setActiveTab("activity")}
            />
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <ClassAssignmentFunnel detailed={true} />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <ClassBatchActions />
          <ClassAccuracyMetrics />
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <ClassroomGoalsManagement />
        </TabsContent>

        <TabsContent value="alignment" className="space-y-4">
          <ClassAlignmentMatrix />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ClassActivityHeatmap expanded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
