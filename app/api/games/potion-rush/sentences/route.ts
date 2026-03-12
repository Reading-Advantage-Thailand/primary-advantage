import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_SENTENCES = 20;
const MIN_SENTENCES = 5;

export const GET = withAuth(async (req, context, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const language =
      (searchParams.get("language") as "th" | "vi" | "cn" | "tw" | "en") ||
      "th";

    // Find user's SENTENCE flashcard deck with cards that have sentence + translation
    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        userId: user.id,
        type: "SENTENCE",
      },
      include: {
        cards: {
          where: {
            type: "SENTENCE",
            sentence: { not: null },
          },
          select: {
            id: true,
            sentence: true,
            translation: true,
          },
        },
      },
    });

    if (!deck || deck.cards.length === 0) {
      return NextResponse.json(
        {
          success: true,
          warning: "NO_SENTENCES",
          sentences: [],
        },
        { status: 200 },
      );
    }

    if (deck.cards.length < MIN_SENTENCES) {
      // Still return what we have, but warn the client
      const sentences = mapCardsToSentences(deck.cards, language);
      return NextResponse.json(
        {
          success: true,
          warning: "INSUFFICIENT_SENTENCES",
          requiredCount: MIN_SENTENCES,
          currentCount: deck.cards.length,
          sentences,
        },
        { status: 200 },
      );
    }

    // Shuffle cards using Fisher-Yates and take up to MAX_SENTENCES
    const shuffled = [...deck.cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, MAX_SENTENCES);
    const sentences = mapCardsToSentences(selected, language);

    return NextResponse.json(
      {
        success: true,
        sentences,
        total: sentences.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching potion rush sentences:", error);
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

function mapCardsToSentences(
  cards: Array<{
    id: string;
    sentence: string | null;
    translation: unknown;
  }>,
  language: string,
) {
  return cards
    .map((card) => {
      const sentence = card.sentence;
      if (!sentence) return null;

      let translation = "";
      const trans = card.translation as Record<string, string> | null;

      if (trans && typeof trans === "object") {
        translation =
          trans[language] ||
          trans.en ||
          trans.th ||
          trans.vi ||
          trans.cn ||
          trans.tw ||
          "";
      }

      if (!translation) return null;

      return { term: sentence, translation };
    })
    .filter(Boolean);
}
