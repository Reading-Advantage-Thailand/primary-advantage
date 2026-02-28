import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/types/enum";

export const POST = withAuth(async (req, context, user) => {
  try {
    const {
      xp,
      accuracy,
      totalAttempts,
      totalCorrect,
      turnsTaken,
      heroId,
      enemyId,
      outcome,
    } = await req.json();

    const xpEarned = Math.max(0, Math.round(xp ?? 0));

    // Create activity record
    const [userActivity] = await prisma.$transaction([
      prisma.userActivity.create({
        data: {
          userId: user.id,
          activityType: ActivityType.RPG_BATTLE,
          targetId: `rpg-battle-${enemyId.toUpperCase()}`,
          details: {
            xpEarned,
            accuracy,
            totalAttempts,
            totalCorrect,
            turnsTaken,
            heroId,
            enemyId,
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
            gameType: ActivityType.RPG_BATTLE,
            difficulty: enemyId.toUpperCase(),
          },
        },
        create: {
          userId: user.id,
          gameType: ActivityType.RPG_BATTLE,
          difficulty: enemyId.toUpperCase(),
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
        activityType: ActivityType.RPG_BATTLE,
      },
    });

    return NextResponse.json({ success: true, xpEarned }, { status: 200 });
  } catch (error) {
    console.error("Error submitting RPG Battle results:", error);
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
