// import { prisma } from "@/lib/prisma";

import { prisma } from "@/lib/prisma";
import { openaiModel } from "@/utils/openai";
import { GeneratedInsight } from "../utils/genaretors/ai-generator";
import { AIInsightScope } from "@prisma/client";
import { startOfDay, subDays } from "date-fns";

// export async function getAISummaryModel(
//   kind?: string,
//   contextId?: string,
//   refresh?: string,
// ) {
//   try {
//     const aiSummary = await prisma.aiSummary.findFirst({
//       where: {
//         kind,
//         contextId,
//         refresh,
//       },
//     });
//     return aiSummary;
//   } catch (error) {
//     console.error("[Model] getAISummaryModel - Error:", error);
//     throw error;
//   }
// }

export async function getAiInsigthsFromDB(
  scope: any,
  contextId?: string | null,
  user?: any,
) {
  // Placeholder function to simulate fetching AI insights from the database
  // Replace this with actual database query logic using Prisma or your ORM of choice
  const dayAgo = startOfDay(subDays(new Date(), 5));

  const whereClause: any = {
    scope,
    createdAt: {
      gt: dayAgo,
    },
  };

  if (user?.id) {
    whereClause.userId = user.id;
  }

  if (contextId) {
    if (scope === AIInsightScope.LICENSE) {
      whereClause.licenseId = contextId;
    } else if (scope === AIInsightScope.CLASSROOM) {
      whereClause.classroomId = contextId;
    }
  }

  const insights = await prisma.aIInsight.findMany({
    where: whereClause,
  });

  return contextId !== null ? insights : [];
}

export async function saveInsights(
  insights: GeneratedInsight[],
  scope: AIInsightScope,
  userId?: string | null,
  classroomId?: string | null,
  licenseId?: string | null,
): Promise<void> {
  try {
    // Delete old insights for this context
    await prisma.aIInsight.deleteMany({
      where: {
        scope,
        userId: userId || null,
        classroomId: classroomId || null,
        licenseId: licenseId || null,
        createdAt: {
          lt: startOfDay(subDays(new Date(), 7)), // Older than 7 days
        },
      },
    });

    // Create new insights
    await prisma.aIInsight.createMany({
      data: insights.map((insight) => ({
        type: insight.type,
        scope,
        priority: insight.priority,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        data: insight.data || {},
        userId,
        classroomId,
        licenseId,
        generatedBy: "ai",
        modelVersion: openaiModel,
        validUntil: insight.validUntil,
      })),
    });
  } catch (error) {
    console.error("Error saving insights:", error);
    throw error;
  }
}
