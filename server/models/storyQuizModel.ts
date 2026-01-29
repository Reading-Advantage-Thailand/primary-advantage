import { prisma } from "@/lib/prisma";
import { calculateLevelAndCefrLevel } from "@/lib/utils";
import { ActivityType, UserXpEarned } from "@/types/enum";

// ==================== Types ====================

export interface SubmitQuizParams {
  userId: string;
  chapterId: string;
  responses: any[];
  score: number;
  timer: number;
  activityType: ActivityType;
}

export interface SubmitQuizResult {
  success: boolean;
  score: number;
  xpEarned: number;
  timer: number;
  activityId: string;
}

export interface RetakeQuizParams {
  userId: string;
  chapterId: string;
  activityType: ActivityType;
}

export interface QuizFeedbackParams {
  chapterId: string;
  question: string;
  answer: string;
  suggestedResponse?: string;
  preferredLanguage: string;
}

// ==================== Model Functions ====================

/**
 * Get user data for quiz submission
 */
export async function getUserForQuiz(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      xp: true,
    },
  });
}

/**
 * Check if user has already completed a quiz
 */
export async function getExistingQuizActivity(
  userId: string,
  chapterId: string,
  activityType: ActivityType,
) {
  return prisma.userActivity.findFirst({
    where: {
      userId,
      targetId: chapterId,
      activityType,
    },
  });
}

/**
 * Calculate XP earned based on activity type and score
 * - MC: score = number of correct answers, XP = score * MCQuestion XP
 * - SAQ: score = AI score (1-5), XP = score * SAQuestion XP
 * - LAQ: score = average AI score (1-5), XP = score * LAQuestion XP
 */
function calculateXpEarned(activityType: ActivityType, score: number): number {
  switch (activityType) {
    case ActivityType.STORIES_MC_QUESTION:
      // MC: score is number of correct answers
      return score * UserXpEarned.MCQuestion;
    case ActivityType.STORIES_SA_QUESTION:
      // SAQ: score is AI score (1-5), multiply by XP value
      return score * UserXpEarned.SAQuestion;
    case ActivityType.STORIES_LA_QUESTION:
      // LAQ: score is average AI score (1-5), multiply by XP value
      return Math.round(score * UserXpEarned.LAQuestion);
    default:
      return 0;
  }
}

/**
 * Submit a quiz (MC, SAQ, or LAQ)
 */
export async function submitQuizModel(
  params: SubmitQuizParams,
): Promise<SubmitQuizResult> {
  const { userId, chapterId, responses, score, timer, activityType } = params;

  // Get user data
  const userData = await getUserForQuiz(userId);
  if (!userData) {
    throw new Error("User not found");
  }

  // Check for existing activity
  const existingActivity = await getExistingQuizActivity(
    userId,
    chapterId,
    activityType,
  );

  if (existingActivity) {
    throw new Error(
      "Quiz already completed. Please retake if you want to try again.",
    );
  }

  // Create user activity
  const userActivity = await prisma.userActivity.create({
    data: {
      userId,
      activityType,
      targetId: chapterId,
      timer,
      details: {
        score,
        responses,
      },
      completed: true,
    },
  });

  // Calculate XP earned
  const xpEarned = calculateXpEarned(activityType, score);

  const { newXp, raLevel, cefrLevel } = calculateLevelAndCefrLevel(
    xpEarned,
    userData.xp as number,
  );

  // Create XP log and update user
  await prisma.$transaction([
    prisma.xPLogs.create({
      data: {
        userId,
        xpEarned,
        activityId: userActivity.id,
        activityType,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level: raLevel,
        cefrLevel: cefrLevel,
      },
    }),
  ]);

  return {
    success: true,
    score,
    xpEarned,
    timer,
    activityId: userActivity.id,
  };
}

/**
 * Retake a quiz (MC only - delete previous activity)
 */
export async function retakeMCQuizModel(
  params: RetakeQuizParams,
): Promise<{ success: boolean }> {
  const { userId, chapterId, activityType } = params;

  // Find the user activity
  const userActivity = await prisma.userActivity.findFirst({
    where: {
      userId,
      targetId: chapterId,
      activityType,
    },
    select: {
      id: true,
    },
  });

  if (!userActivity) {
    throw new Error("Quiz activity not found");
  }

  // Delete XP logs and activity in transaction
  await prisma.$transaction([
    prisma.xPLogs.deleteMany({
      where: {
        activityId: userActivity.id,
      },
    }),
    prisma.userActivity.delete({
      where: { id: userActivity.id },
    }),
  ]);

  return { success: true };
}

/**
 * Get chapter data for SAQ/LAQ feedback
 */
export async function getChapterForFeedback(chapterId: string) {
  return prisma.storyChapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      passage: true,
      story: {
        select: {
          cefrLevel: true,
          raLevel: true,
        },
      },
    },
  });
}
