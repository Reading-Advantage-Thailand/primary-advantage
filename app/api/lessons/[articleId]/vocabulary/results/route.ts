import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@prisma/client";

export const GET = withAuth(async (_req, context, user) => {
  try {
    const { articleId } = await context.params;

    const latestResult = await prisma.userActivity.findFirst({
      where: {
        userId: user.id,
        activityType: ActivityType.VOCABULARY_MATCHING,
        targetId: articleId,
        completed: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        details: true,
        createdAt: true,
      },
    });

    if (!latestResult) {
      return NextResponse.json({ success: true, result: null });
    }

    const details = latestResult.details as Record<string, unknown> | null;

    return NextResponse.json({
      success: true,
      result: {
        score: details?.score ?? 0,
        xp: details?.xp ?? 0,
        accuracy: details?.accuracy ?? 0,
        correctAnswers: details?.correctAnswers ?? 0,
        totalAttempts: details?.totalAttempts ?? 0,
        gameId: details?.gameId ?? details?.difficulty ?? null,
        createdAt: latestResult.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching lesson game results:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch results",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
