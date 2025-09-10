import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deckId } = await params;

    // Get difficulty from query parameters
    const { searchParams } = new URL(request.url);
    const difficulty =
      (searchParams.get("difficulty") as "easy" | "medium" | "hard") ||
      "medium";

    // Get both sentence and vocabulary flashcards that are due
    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      include: {
        cards: {
          where: {
            due: { lte: new Date() },
            articleId: { not: null },
          },
          include: {
            reviews: {
              orderBy: { reviewedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    if (deck.cards.length === 0) {
      return NextResponse.json({
        matchingGames: [],
        message: "No due flashcards found",
      });
    }

    // Separate vocabulary and sentence cards
    const vocabularyCards = deck.cards.filter(
      (card) => card.type === "VOCABULARY",
    );
    const sentenceCards = deck.cards.filter((card) => card.type === "SENTENCE");

    const matchingGames = [];

    // Process vocabulary cards for direct word-definition matching
    if (vocabularyCards.length > 0) {
      const vocabularyPairs = await createVocabularyPairs(vocabularyCards);
      if (vocabularyPairs.length > 0) {
        matchingGames.push({
          id: `vocab-${Date.now()}-${Math.random()}`,
          pairs: vocabularyPairs,
          difficulty: difficulty,
        });
      }
    }

    // Process sentence cards to extract words for matching
    if (sentenceCards.length > 0) {
      const sentencePairs = await createSentencePairs(
        sentenceCards,
        difficulty,
      );
      if (sentencePairs.length > 0) {
        matchingGames.push({
          id: `sentence-${Date.now()}-${Math.random()}`,
          pairs: sentencePairs,
          difficulty: difficulty,
        });
      }
    }

    // Shuffle the matching games
    const shuffledGames = matchingGames.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      matchingGames: shuffledGames,
      totalGames: shuffledGames.length,
    });
  } catch (error) {
    console.error("Error fetching sentences for matching:", error);
    return NextResponse.json(
      { error: "Failed to fetch sentences for matching" },
      { status: 500 },
    );
  }
}

// Helper function to create vocabulary matching pairs
async function createVocabularyPairs(vocabularyCards: any[]) {
  const pairs = [];

  for (const card of vocabularyCards) {
    if (!card.word || !card.definition) continue;

    // Get the article for audio data
    const article = await prisma.article.findUnique({
      where: { id: card.articleId },
      select: {
        id: true,
        title: true,
        audioUrl: true,
        words: true,
      },
    });

    if (!article) continue;

    // Find the word in the article's words array for audio timing
    const articleWords = article.words as any[];
    const matchingWord = articleWords?.find(
      (w) => w.vocabulary?.toLowerCase() === card.word?.toLowerCase(),
    );

    // Extract definition text (handle multiple languages)
    let definitionText = "";
    if (typeof card.definition === "object" && card.definition !== null) {
      // Try to get English definition first, then fallback to other languages
      definitionText =
        (card.definition as any).en ||
        (card.definition as any).th ||
        (card.definition as any).vi ||
        (card.definition as any).cn ||
        (card.definition as any).tw ||
        JSON.stringify(card.definition);
    } else if (typeof card.definition === "string") {
      definitionText = card.definition;
    }

    pairs.push({
      id: `vocab-pair-${card.id}`,
      left: {
        id: `left-${card.id}`,
        content: card.word,
        type: "word",
      },
      right: {
        id: `right-${card.id}`,
        content: definitionText,
        type: "definition",
      },
      articleId: article.id,
      articleTitle: article.title,
      audioUrl: article.audioUrl
        ? `https://storage.googleapis.com/primary-app-storage${article.audioUrl}`
        : undefined,
      startTime: matchingWord?.startTime,
      endTime: matchingWord?.endTime,
    });
  }

  return pairs;
}

// Helper function to create sentence-based matching pairs
async function createSentencePairs(sentenceCards: any[], difficulty: string) {
  const pairs = [];

  for (const card of sentenceCards) {
    if (!card.sentence) continue;

    // Get the article for word and translation data
    const article = await prisma.article.findUnique({
      where: { id: card.articleId },
      select: {
        id: true,
        title: true,
        sentences: true,
        words: true,
        audioUrl: true,
        translatedPassage: true,
      },
    });

    if (!article) continue;

    const articleSentences = article.sentences as any[];
    const articleWords = article.words as any[];

    // Find the matching sentence in the article
    const sentenceIndex = articleSentences.findIndex(
      (s) => s.sentence === card.sentence,
    );

    if (sentenceIndex === -1) continue;

    const matchingSentence = articleSentences[sentenceIndex];

    // Extract vocabulary words from the sentence
    const sentenceWords = matchingSentence.words || [];

    // Filter words suitable for matching
    const candidateWords = sentenceWords.filter((wordObj: any) => {
      const word = wordObj.word?.toLowerCase();
      if (!word) return false;

      const commonWords = [
        "the",
        "and",
        "for",
        "are",
        "but",
        "not",
        "you",
        "all",
        "can",
        "had",
        "her",
        "was",
        "one",
        "our",
        "out",
        "day",
        "get",
        "has",
        "him",
        "his",
        "how",
        "its",
        "may",
        "new",
        "now",
        "old",
        "see",
        "two",
        "way",
        "who",
        "a",
        "an",
        "in",
        "on",
        "at",
        "to",
        "of",
        "is",
        "it",
        "be",
        "do",
      ];

      return (
        word.length > 3 &&
        !commonWords.includes(word) &&
        /^[a-zA-Z]+$/.test(word)
      );
    });

    // Determine number of pairs based on difficulty
    const pairCount =
      difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;

    // Select words for matching
    const selectedWords = candidateWords
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(pairCount, candidateWords.length));

    // Create pairs for each selected word
    for (const wordObj of selectedWords) {
      // Find definition from article words data
      const wordDefinition = articleWords?.find(
        (w) => w.vocabulary?.toLowerCase() === wordObj.word?.toLowerCase(),
      );

      let definitionText = "";
      if (wordDefinition?.definition) {
        if (typeof wordDefinition.definition === "object") {
          // Try to get English definition first, then fallback
          definitionText =
            wordDefinition.definition.en ||
            wordDefinition.definition.th ||
            wordDefinition.definition.vi ||
            wordDefinition.definition.cn ||
            wordDefinition.definition.tw ||
            "Definition not available";
        } else {
          definitionText = wordDefinition.definition;
        }
      } else {
        // Fallback to sentence translation if no word definition
        const sentenceTranslation =
          (article.translatedPassage as any)?.en?.[sentenceIndex] ||
          (article.translatedPassage as any)?.th?.[sentenceIndex] ||
          (article.translatedPassage as any)?.vi?.[sentenceIndex] ||
          "Context: " + card.sentence;
        definitionText = `From context: ${sentenceTranslation}`;
      }

      pairs.push({
        id: `sentence-pair-${card.id}-${wordObj.word}`,
        left: {
          id: `left-${card.id}-${wordObj.word}`,
          content: wordObj.word,
          type: "word",
        },
        right: {
          id: `right-${card.id}-${wordObj.word}`,
          content: definitionText,
          type: "meaning",
        },
        articleId: article.id,
        articleTitle: article.title,
        audioUrl: article.audioUrl
          ? `https://storage.googleapis.com/primary-app-storage${article.audioUrl}`
          : undefined,
        startTime: wordObj.startTime,
        endTime: wordObj.endTime,
      });
    }
  }

  return pairs;
}

// Helper function to generate translation-based pairs
async function createTranslationPairs(
  sentenceCards: any[],
  targetLanguage: string = "th",
) {
  const pairs = [];

  for (const card of sentenceCards) {
    if (!card.sentence || !card.translation) continue;

    const translation = (card.translation as any)?.[targetLanguage];
    if (!translation) continue;

    pairs.push({
      id: `translation-pair-${card.id}`,
      left: {
        id: `left-${card.id}`,
        content: card.sentence,
        type: "sentence",
      },
      right: {
        id: `right-${card.id}`,
        content: translation,
        type: "translation",
      },
      articleId: card.articleId,
      articleTitle: "Translation Practice",
      audioUrl: card.audioUrl,
      startTime: card.startTime,
      endTime: card.endTime,
    });
  }

  return pairs;
}
