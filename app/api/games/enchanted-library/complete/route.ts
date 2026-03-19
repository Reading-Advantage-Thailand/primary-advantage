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
      difficulty,
      gameTime,
    } = await req.json();

    if (!difficulty || typeof difficulty !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid difficulty" },
        { status: 400 },
      );
    }

    const xpEarned = Math.max(0, Math.round(xp ?? 0));
    const difficultyKey = difficulty.toUpperCase();

    // Create activity record, update XP, and upsert ranking in one transaction
    const [userActivity] = await prisma.$transaction([
      prisma.userActivity.create({
        data: {
          userId: user.id,
          activityType: ActivityType.ENCHANTED_LIBRARY,
          targetId: `enchanted-library-${difficultyKey}`,
          details: {
            xpEarned,
            accuracy,
            totalAttempts,
            correctAnswers,
            difficulty: difficultyKey,
            gameTime,
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
            gameType: ActivityType.ENCHANTED_LIBRARY,
            difficulty: difficultyKey,
          },
        },
        create: {
          userId: user.id,
          gameType: ActivityType.ENCHANTED_LIBRARY,
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
        activityType: ActivityType.ENCHANTED_LIBRARY,
      },
    });

    return NextResponse.json({ success: true, xpEarned }, { status: 200 });
  } catch (error) {
    console.error("Error submitting Enchanted Library results:", error);
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
