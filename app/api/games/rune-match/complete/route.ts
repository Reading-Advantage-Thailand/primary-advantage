import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityType, UserXpEarned } from "@/types/enum";

export const POST = withAuth(async (req, context, user) => {
  try {
    const { score, correctAnswers, totalAttempts, accuracy, difficulty } =
      await req.json();

    const difficultyKey = (difficulty as string).toUpperCase();

    // Create activity record
    const [userActivity] = await prisma.$transaction([
      prisma.userActivity.create({
        data: {
          userId: user.id,
          activityType: ActivityType.RUNE_MATCH,
          targetId: `rune-match-${difficultyKey}`,
          details: {
            score,
            correctAnswers,
            totalAttempts,
            accuracy,
            difficulty: difficultyKey,
            xp: score,
          },
          completed: true,
        },
      }),

      prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: score } },
      }),

      prisma.gameRanking.upsert({
        where: {
          userId_gameType_difficulty: {
            userId: user.id,
            gameType: ActivityType.RUNE_MATCH,
            difficulty: difficultyKey,
          },
        },
        create: {
          userId: user.id,
          gameType: ActivityType.RUNE_MATCH,
          difficulty: difficultyKey,
          totalXp: score,
        },
        update: {
          totalXp: { increment: score },
        },
      }),
    ]);

    // Create XP log
    await prisma.xPLogs.create({
      data: {
        userId: user.id,
        xpEarned: score,
        activityId: userActivity.id,
        activityType: ActivityType.RUNE_MATCH,
      },
    });

    return NextResponse.json(
      { success: true, xpEarned: score },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error submitting rune match results:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit game results",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
