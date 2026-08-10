import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ActivityType } from "@prisma/client";

const RESETTABLE_LESSON_ACTIVITY_TYPES: ActivityType[] = [
  ActivityType.MC_QUESTION,
  ActivityType.SA_QUESTION,
  ActivityType.LA_QUESTION,
  ActivityType.SENTENCE_FLASHCARDS,
  ActivityType.SENTENCE_MATCHING,
  ActivityType.SENTENCE_ORDERING,
  ActivityType.SENTENCE_WORD_ORDERING,
  ActivityType.SENTENCE_CLOZE_TEST,
  ActivityType.VOCABULARY_FLASHCARDS,
  ActivityType.VOCABULARY_MATCHING,
];

/**
 * Clear attempt-specific records so a restarted lesson starts with fresh
 * quizzes and activities while preserving article read/rating history.
 */
export async function resetArticleLearningActivities(
  userId: string,
  articleId: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.userActivity.deleteMany({
      where: {
        userId,
        targetId: articleId,
        activityType: { in: RESETTABLE_LESSON_ACTIVITY_TYPES },
      },
    });

    const updatedActivityLogs = await tx.articleActivityLog.updateMany({
      where: { articleId, userId },
      data: {
        isMultipleChoiceQuestionCompleted: false,
        isShortAnswerQuestionCompleted: false,
        isLongAnswerQuestionCompleted: false,
        isSentenceMatchingCompleted: false,
        isSentenceOrderingCompleted: false,
        isSentenceWordOrderingCompleted: false,
        isSentenceClozeTestCompleted: false,
      },
    });

    if (updatedActivityLogs.count === 0) {
      await tx.articleActivityLog.create({
        data: {
          articleId,
          userId,
        },
      });
    }
  });
}

/**
 * Get an article by ID for standalone lesson (without assignment)
 */
export async function getArticleForLesson(articleId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User is not authenticated");
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        sentencsAndWordsForFlashcard: true,
        multipleChoiceQuestions: true,
        shortAnswerQuestions: true,
        longAnswerQuestions: true,
      },
    });

    if (!article) {
      throw new Error("Article not found");
    }

    return article;
  } catch (error) {
    console.error("Model Error - getArticleForLesson:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get article for lesson");
  }
}

/**
 * Update user lesson progress for standalone lessons (without assignment)
 */
export async function updateStandaloneLessonProgress(
  userId: string,
  articleId: string,
  progress: number,
  timeSpent: number,
) {
  try {
    const existingProgress = await prisma.userLessonProgress.findFirst({
      where: {
        userId,
        articleId,
        assignmentId: null, // Only for standalone lessons
      },
    });

    if (existingProgress) {
      // Update existing progress
      await prisma.userLessonProgress.update({
        where: { id: existingProgress.id },
        data: {
          progress,
          timeSpent,
          isCompleted: progress === 100,
        },
      });
    } else {
      // Create new progress record
      await prisma.$transaction(async (tx) => {
        await tx.userLessonProgress.create({
          data: {
            userId,
            articleId,
            assignmentId: null, // Standalone lesson
            progress,
            timeSpent,
            isCompleted: progress === 100,
          },
        });

        // Check if activity log exists
        const existingActivity = await tx.articleActivityLog.findFirst({
          where: { articleId, userId },
        });

        // Create activity log if it doesn't exist
        if (!existingActivity) {
          await tx.articleActivityLog.create({
            data: {
              articleId,
              userId,
            },
          });
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Model Error - updateStandaloneLessonProgress:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update standalone lesson progress");
  }
}

/**
 * Reset a standalone lesson to its introduction task for a new attempt.
 */
export async function resetStandaloneLessonProgress(
  userId: string,
  articleId: string,
) {
  try {
    const existingProgress = await prisma.userLessonProgress.findFirst({
      where: {
        userId,
        articleId,
        assignmentId: null,
      },
    });

    if (existingProgress) {
      await prisma.userLessonProgress.update({
        where: { id: existingProgress.id },
        data: {
          progress: 0,
          timeSpent: 0,
          isCompleted: false,
          score: null,
        },
      });
    } else {
      await prisma.userLessonProgress.create({
        data: {
          userId,
          articleId,
          assignmentId: null,
          progress: 0,
          timeSpent: 0,
          isCompleted: false,
        },
      });
    }

    await resetArticleLearningActivities(userId, articleId);

    return { success: true };
  } catch (error) {
    console.error("Model Error - resetStandaloneLessonProgress:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to reset standalone lesson progress");
  }
}

/**
 * Get user progress for a standalone lesson
 */
export async function getStandaloneLessonProgress(
  userId: string,
  articleId: string,
) {
  try {
    const progress = await prisma.userLessonProgress.findFirst({
      where: {
        userId,
        articleId,
        assignmentId: null, // Only for standalone lessons
      },
    });

    // Return default progress if not found
    if (!progress) {
      return {
        progress: 0,
        timeSpent: 0,
        isCompleted: false,
      };
    }

    return progress;
  } catch (error) {
    console.error("Model Error - getStandaloneLessonProgress:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get standalone lesson progress");
  }
}

/**
 * Get article activity for standalone lesson (used for sentence activities)
 */
export async function getArticleActivity(articleId: string, userId: string) {
  try {
    const activity = await prisma.articleActivityLog.findFirst({
      where: { articleId, userId },
      select: {
        isSentenceMatchingCompleted: true,
        isSentenceOrderingCompleted: true,
        isSentenceWordOrderingCompleted: true,
        isSentenceClozeTestCompleted: true,
      },
    });

    // Return default values if not found
    if (!activity) {
      return {
        isSentenceMatchingCompleted: false,
        isSentenceOrderingCompleted: false,
        isSentenceWordOrderingCompleted: false,
        isSentenceClozeTestCompleted: false,
      };
    }

    return activity;
  } catch (error) {
    console.error("Model Error - getArticleActivity:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get article activity");
  }
}
