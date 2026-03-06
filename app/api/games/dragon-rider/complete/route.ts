import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/types/enum";

export const POST = withAuth(async (req, _context, user) => {
  try {
    const {
      xp,
      accuracy,
      totalAttempts,
      correctAnswers,
      dragonCount,
      difficulty,
      outcome,
    } = await req.json();

    const xpEarned = Math.max(0, Math.round(xp ?? 0));
    const difficultyKey = (difficulty as string).toUpperCase();

    // Create activity record, update XP, and upsert ranking in one transaction
    const [userActivity] = await prisma.$transaction([
      prisma.userActivity.create({
        data: {
          userId: user.id,
          activityType: ActivityType.DRAGON_RIDER,
          targetId: `dragon-rider-${difficultyKey}`,
          details: {
            xpEarned,
            accuracy,
            totalAttempts,
            correctAnswers,
            dragonCount,
            difficulty: difficultyKey,
            outcome,
          },
          completed: true,
        },
      }),

      prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: xpEarned } },
      }),

      prisma.gameRanking.upsert({
        where: {
          userId_gameType_difficulty: {
            userId: user.id,
            gameType: ActivityType.DRAGON_RIDER,
            difficulty: difficultyKey,
          },
        },
        create: {
          userId: user.id,
          gameType: ActivityType.DRAGON_RIDER,
          difficulty: difficultyKey,
          totalXp: xpEarned,
        },
        update: {
          totalXp: { increment: xpEarned },
        },
      }),
    ]);

    // Create XP log
    await prisma.xPLogs.create({
      data: {
        userId: user.id,
        xpEarned,
        activityId: userActivity.id,
        activityType: ActivityType.DRAGON_RIDER,
      },
    });

    return NextResponse.json({ success: true, xpEarned }, { status: 200 });
  } catch (error) {
    console.error("Error submitting Dragon Rider results:", error);
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
