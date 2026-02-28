import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_VOCABULARY_ITEMS = 20;

export const GET = withAuth(async (req, context, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const language =
      (searchParams.get("language") as "th" | "vi" | "cn" | "tw" | "en") ||
      "th";

    // Find user's VOCABULARY flashcard deck with cards that have word + definition
    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        userId: user.id,
        type: "VOCABULARY",
      },
      include: {
        cards: {
          where: {
            type: "VOCABULARY",
            word: { not: null },
            definition: { not: undefined },
          },
          select: {
            id: true,
            word: true,
            definition: true,
          },
        },
      },
    });

    if (!deck || deck.cards.length === 0) {
      return NextResponse.json(
        {
          success: true,
          vocabulary: [],
          message: "No vocabulary cards found in flashcard deck",
        },
        { status: 200 },
      );
    }

    // Shuffle cards using Fisher-Yates and take up to MAX_VOCABULARY_ITEMS
    const shuffled = [...deck.cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, MAX_VOCABULARY_ITEMS);

    // Map FlashcardCard → VocabularyItem { term, translation }
    const vocabulary = selected
      .map((card) => {
        const word = card.word;
        if (!word) return null;

        let translation = "";
        const def = card.definition as Record<string, string> | null;

        if (def && typeof def === "object") {
          // Try target language first, then fallback chain
          translation =
            def[language] ||
            def.en ||
            def.th ||
            def.vi ||
            def.cn ||
            def.tw ||
            "";
        }

        if (!translation) return null;

        return { term: word, translation };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        success: true,
        vocabulary,
        total: vocabulary.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching rune match vocabulary:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
