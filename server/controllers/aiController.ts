import { AIInsightScope } from "@prisma/client";
import { AuthenticatedUser } from "../utils/middleware";
import {
  generateSystemInsights,
  saveInsights,
  generateLicenseInsights,
  generateTeacherInsights,
  generateStudentInsights,
  generateClassroomInsights,
} from "../utils/genaretors/ai-generator";
import { AIInsight, AISummaryResponse } from "@/types/dashboard";

export async function fetchAISummaryController(
  kind?: string,
  contextId?: string,
  refresh?: string,
  user?: AuthenticatedUser,
) {
  const startTime = Date.now();

  try {
    let insights: any[] = [];
    let scope: AIInsightScope;

    if (kind === "system") {
      scope = AIInsightScope.SYSTEM;
    } else if (kind === "license") {
      scope = AIInsightScope.LICENSE;
    } else if (kind === "student") {
      scope = AIInsightScope.STUDENT;
    } else if (kind === "teacher") {
      scope = AIInsightScope.TEACHER;
    } else if (kind === "classroom") {
      scope = AIInsightScope.CLASSROOM;
    } else {
      scope = AIInsightScope.STUDENT;
    }

    // If no cached insights or forced refresh, generate new ones
    if (insights.length === 0) {
      let generatedInsights: any[] = [];

      switch (scope) {
        case AIInsightScope.STUDENT:
          generatedInsights = await generateStudentInsights(
            contextId || user?.id || "",
          );
          break;
        case AIInsightScope.TEACHER:
          generatedInsights = await generateTeacherInsights(contextId || "");
          break;
        case AIInsightScope.CLASSROOM:
          generatedInsights = await generateClassroomInsights(contextId || "");
          break;
        case AIInsightScope.LICENSE:
          // ADMIN sees only their school's license
          generatedInsights = await generateLicenseInsights(contextId || "");
          break;
        case AIInsightScope.SYSTEM:
          // SYSTEM sees all schools - generate system-wide insights
          generatedInsights = await generateSystemInsights();
          break;
        default:
          generatedInsights = [];
      }

      // Save insights to database
      if (generatedInsights.length > 0) {
        await saveInsights(generatedInsights, scope);

        insights = generatedInsights;
      }
    }

    // Transform to API response format
    const apiInsights: AIInsight[] = insights.map((insight: any) => ({
      id: insight.id,
      type: insight.type.toLowerCase() as any,
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence,
      priority: insight.priority.toLowerCase() as any,
      data: insight.data || {},
      // createdAt: insight.createdAt.toISOString(),
    }));

    const getActionItems = (scope?: string) => {
      if (scope === AIInsightScope.STUDENT) {
        return [
          "Review your progress",
          "Set personal goals",
          "Practice regularly",
          "Track your improvement",
        ];
      } else if (scope === AIInsightScope.TEACHER) {
        return [
          "Review class performance",
          "Adjust teaching strategies",
          "Provide targeted support",
          "Monitor student progress",
        ];
      } else if (
        scope === AIInsightScope.LICENSE ||
        scope === AIInsightScope.SYSTEM
      ) {
        return [
          "Review the metrics",
          "Plan strategic actions",
          "Allocate resources effectively",
          "Monitor implementation",
        ];
      }
      return [
        "Review the recommendation",
        "Plan next steps",
        "Take action",
        "Monitor results",
      ];
    };

    const response = apiInsights
      .filter((insight: AIInsight) => insight.type === "recommendation")
      .slice(0, 3)
      .map((insight: AIInsight, idx: number) => ({
        id: `suggestion-${idx}`,
        title: insight.title,
        description: insight.description,
        priority: insight.priority,
        category: "performance",
        estimatedImpact: "Data-driven improvement",
        actions: getActionItems(scope),
      }));

    const duration = Date.now() - startTime;

    return {
      insights: apiInsights,
      suggestions: response,
      duration: duration,
      status: insights.length > 0 ? "ready" : "generating",
    };
  } catch (error) {
    console.error("[Controller] fetchAISummaryController - Error:", error);
    throw error;
  }
}
