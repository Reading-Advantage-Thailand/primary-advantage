import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { WordListTimestamp } from "@/types";
import { ActivityType } from "@prisma/client";

const MAX_VOCABULARY_ITEMS = 20;

export const GET = withAuth(async (req, context, user) => {
  try {
    const { articleId } = await context.params;
    const { searchParams } = new URL(req.url);
    const language =
      (searchParams.get("language") as "th" | "vi" | "cn" | "tw" | "en") ||
      "th";

    // Fetch vocabulary words from article's SentencsAndWordsForFlashcard
    const record = await prisma.sentencsAndWordsForFlashcard.findFirst({
      where: { articleId },
      select: { words: true },
    });

    const words = (record?.words as WordListTimestamp[] | null) ?? [];

    if (words.length === 0) {
      return NextResponse.json(
        {
          success: true,
          vocabulary: [],
          message: "No vocabulary found for this article",
        },
        { status: 200 },
      );
    }

    // Shuffle words using Fisher-Yates, then take up to MAX_VOCABULARY_ITEMS
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, MAX_VOCABULARY_ITEMS);

    // Map WordListTimestamp → VocabularyItem { term, translation }
    const vocabulary = selected
      .map((word) => {
        if (!word.vocabulary) return null;

        const def = word.definition;
        const translation =
          def?.[language] ||
          def?.en ||
          def?.th ||
          def?.vi ||
          def?.cn ||
          def?.tw ||
          "";

        if (!translation) return null;

        return { term: word.vocabulary, translation };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, vocabulary }, { status: 200 });
  } catch (error) {
    console.error("Error fetching article vocabulary:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch vocabulary",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (req, context, user) => {
  try {
    const { articleId } = await context.params;
    const body = await req.json();

    // Validate input
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 },
      );
    }

    const {
      xp,
      score,
      correctAnswers,
      totalAttempts,
      accuracy,
      difficulty,
      gameId,
    } = body;

    // Here you would typically save the results to the database
    // For example:
    const [userActivity] = await prisma.$transaction([
      prisma.userActivity.create({
        data: {
          userId: user.id as string,
          activityType: ActivityType.VOCABULARY_MATCHING,
          targetId: articleId,
          details: {
            articleId: articleId,
            targetId: `lesson-vocabulary-game-${articleId}`,
            xp: xp,
            score: score,
            accuracy: accuracy,
            correctAnswers: correctAnswers,
            totalAttempts: totalAttempts,
            difficulty: difficulty,
            gameId: gameId,
          },
          completed: true,
        },
      }),

      prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: xp } },
      }),
    ]);

    await prisma.xPLogs.create({
      data: {
        userId: user.id,
        xpEarned: xp,
        activityId: userActivity.id,
        activityType: ActivityType.VOCABULARY_MATCHING,
      },
    });

    return NextResponse.json({ success: true, message: "Results submitted" });
  } catch (error) {
    console.error("Error submitting lesson game results:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit results",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
