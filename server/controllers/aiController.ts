import { AIInsightScope } from "@prisma/client";
import { AuthenticatedUser } from "../utils/middleware";
import {
  generateSystemInsights,
  generateLicenseInsights,
  generateTeacherInsights,
  generateStudentInsights,
  generateClassroomInsights,
} from "../utils/genaretors/ai-generator";
import { AIInsight } from "@/types/dashboard";
import { getAiInsigthsFromDB, saveInsights } from "../models/aiModel";

export async function fetchAISummaryController(
  kind?: string,
  contextId?: string | null,
  user?: AuthenticatedUser,
) {
  const startTime = Date.now();

  try {
    let insights: any[] = [];
    let scope: AIInsightScope;
    let classroomId: string | undefined | null;
    let licenseId: string | undefined | null;
    let userId: string | undefined;

    if (kind === "system") {
      scope = AIInsightScope.SYSTEM;
    } else if (kind === "license") {
      scope = AIInsightScope.LICENSE;
      licenseId = contextId;
    } else if (kind === "student") {
      scope = AIInsightScope.STUDENT;
      userId = contextId || user?.id;
    } else if (kind === "teacher") {
      scope = AIInsightScope.TEACHER;
      userId = contextId || user?.id;
    } else if (kind === "classroom") {
      scope = AIInsightScope.CLASSROOM;
      classroomId = contextId;
    } else {
      scope = AIInsightScope.STUDENT;
    }

    //check for cached insights in DB
    insights = await getAiInsigthsFromDB(scope, contextId, user);

    // If no cached insights or forced refresh, generate new ones
    if (!insights.length) {
      let generatedInsights: any[] = [];

      switch (scope) {
        case AIInsightScope.STUDENT:
          generatedInsights = await generateStudentInsights(userId || "");
          break;
        case AIInsightScope.TEACHER:
          generatedInsights = await generateTeacherInsights(userId || "");
          break;
        case AIInsightScope.CLASSROOM:
          generatedInsights = await generateClassroomInsights(
            classroomId || "",
          );
          break;
        case AIInsightScope.LICENSE:
          // ADMIN sees only their school's license
          generatedInsights = await generateLicenseInsights(licenseId || "");
          break;
        case AIInsightScope.SYSTEM:
          // SYSTEM sees all schools - generate system-wide insights
          generatedInsights = await generateSystemInsights();
          break;
        default:
          generatedInsights = [];
      }

      // Save insights to database
      if (
        generatedInsights.length > 0 &&
        generatedInsights[0].data !== "fallback"
      ) {
        await saveInsights(
          generatedInsights,
          scope,
          user?.id || null,
          classroomId || null,
          licenseId || null,
        );

        insights = generatedInsights;
      } else if (generatedInsights[0].data === "fallback") {
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
