"use server";

import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/types/enum";
import { calculateLevelAndCefrLevel } from "@/lib/utils";

/**
 * Updates user activity, recording XP earned and updating level/CEFR based on activity.
 * @param articleId - The ID of the article associated with the activity
 * @param type - The type of activity performed
 * @param xpEarned - Amount of XP earned from the activity
 * @param timer - Time spent on the activity in seconds
 * @param data - Additional activity data including score and details
 */
export async function updateUserActivity(
  articleId: string,
  type: ActivityType,
  xpEarned: number,
  timer: number,
  data: {
    score?: number;
    details?: Record<string, any>;
  } = {},
) {
  const user = await currentUser();

  if (!user) {
    return { error: "User not found" };
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.id as string },
    select: {
      xp: true,
    },
  });

  if (!userData) {
    return { error: "User not found" };
  }

  let isCompleted = {};

  // Create user activity first
  const userActivity = await prisma.userActivity.create({
    data: {
      userId: user.id as string,
      activityType: type,
      targetId: articleId,
      timer: timer,
      details: data,
      completed: true,
    },
  });

  const { newXp, raLevel, cefrLevel } = calculateLevelAndCefrLevel(
    xpEarned,
    userData.xp as number,
  );

  const activityLog = await prisma.articleActivityLog.findFirst({
    where: { articleId: articleId as string, userId: user.id as string },
    select: {
      id: true,
    },
  });

  if (activityLog) {
    await prisma.articleActivityLog.update({
      where: { id: activityLog.id },
      data: {
        ...isCompleted,
      },
    });
  } else {
    await prisma.articleActivityLog.create({
      data: {
        articleId: articleId as string,
        userId: user.id as string,
        ...isCompleted,
      },
    });
  }

  await prisma.$transaction([
    prisma.xPLogs.create({
      data: {
        userId: user.id as string,
        xpEarned: xpEarned,
        activityId: userActivity.id,
        activityType: type,
      },
    }),
    prisma.user.update({
      where: { id: user.id as string },
      data: {
        xp: newXp,
        level: raLevel,
        cefrLevel: cefrLevel,
      },
    }),
  ]);

  return { success: true };
}
