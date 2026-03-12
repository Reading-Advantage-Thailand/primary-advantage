import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/types/enum";

export const POST = withAuth(async (req, context, user) => {
  try {
    const {
      xp,
      score,
      correctAnswers,
      totalAttempts,
      accuracy,
      difficulty,
      gameTime,
    } = await req.json();

    const difficultyKey = (difficulty as string).toUpperCase();

    // Create activity record, update XP, and upsert ranking in a transaction
    const [userActivity] = await prisma.$transaction([
      prisma.userActivity.create({
        data: {
          userId: user.id,
          activityType: ActivityType.POTION_RUSH,
          targetId: `potion-rush-${difficultyKey}`,
          details: {
            score,
            correctAnswers,
            totalAttempts,
            accuracy,
            difficulty: difficultyKey,
            gameTime,
            xp,
          },
          completed: true,
        },
      }),

      prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: xp } },
      }),

      prisma.gameRanking.upsert({
        where: {
          userId_gameType_difficulty: {
            userId: user.id,
            gameType: "POTION_RUSH",
            difficulty: difficultyKey,
          },
        },
        create: {
          userId: user.id,
          gameType: "POTION_RUSH",
          difficulty: difficultyKey,
          totalXp: xp,
        },
        update: {
          totalXp: { increment: xp },
        },
      }),
    ]);

    // Create XP log
    await prisma.xPLogs.create({
      data: {
        userId: user.id,
        xpEarned: xp,
        activityId: userActivity.id,
        activityType: ActivityType.POTION_RUSH,
      },
    });

    return NextResponse.json({ success: true, xpEarned: xp }, { status: 200 });
  } catch (error) {
    console.error("Error submitting potion rush results:", error);
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
