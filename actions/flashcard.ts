"use server";

import { currentUser } from "@/lib/session";
import { createEmptyCard, Card, State, Rating } from "ts-fsrs";
import { prisma } from "@/lib/prisma";
import { ActivityType, FlashcardType } from "@/types/enum";
import { FlashcardCard } from "@/types";
import { CardState } from "@prisma/client";
import { fsrsService } from "@/lib/fsrs-service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface WordList {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  startTime: number;
  endTime: number;
  audioUrl: string;
}

interface Sentence {
  sentence: string;
  translation: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  startTime: number;
  endTime: number;
  audioUrl: string;
}

export async function saveFlashcard(
  articleId: string,
  words?: WordList[],
  sentences?: Sentence[],
) {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        status: 401,
        message: "Unauthorized",
      };
    }

    // Validate input
    if (!words?.length && !sentences?.length) {
      return {
        status: 400,
        message: "No words or sentences provided",
      };
    }

    const type = words?.length ? "VOCABULARY" : "SENTENCE";
    const items = words?.length ? words : sentences || [];

    // Check if user already has a deck of this type for this article
    let deck = await prisma.flashcardDeck.findFirst({
      where: {
        userId: user.id,
        type: type as FlashcardType,
      },
      include: {
        cards: true,
      },
    });

    // Create deck if it doesn't exist
    if (!deck) {
      deck = await prisma.flashcardDeck.create({
        data: {
          userId: user.id as string,
          type: type as FlashcardType,
        },
        include: {
          cards: true,
        },
      });
    }

    // Check for existing cards to avoid duplicates
    const existingWords = deck.cards
      .filter((card) => card.type === type)
      .map((card) => (type === "VOCABULARY" ? card.word : card.sentence));

    const newItems =
      type === "VOCABULARY"
        ? items.filter((item) => {
            const wordItem = item as WordList;
            return !existingWords.includes(wordItem.vocabulary);
          })
        : items;

    if (newItems.length === 0) {
      return {
        status: 400,
        message: "All selected items are already saved as flashcards",
      };
    }

    // Create initial FSRS card state
    const emptyCard: Card = createEmptyCard();

    // Prepare card data for bulk insert
    const cardData = newItems.map((item) => {
      const baseCard = {
        deckId: deck!.id,
        type: type as FlashcardType,
        articleId,
        audioUrl: item.audioUrl,
        startTime: item.startTime,
        endTime: item.endTime,
        // FSRS initial state
        due: emptyCard.due,
        stability: emptyCard.stability,
        difficulty: emptyCard.difficulty,
        elapsedDays: emptyCard.elapsed_days,
        scheduledDays: emptyCard.scheduled_days,
        learningSteps: emptyCard.learning_steps,
        reps: emptyCard.reps,
        lapses: emptyCard.lapses,
        state: CardState.NEW,
        lastReview: emptyCard.last_review,
      };

      if (type === "VOCABULARY") {
        const wordItem = item as WordList;
        return {
          ...baseCard,
          word: wordItem.vocabulary,
          definition: wordItem.definition,
        };
      } else {
        const sentenceItem = item as Sentence;
        return {
          ...baseCard,
          sentence: sentenceItem.sentence,
          translation: sentenceItem.translation,
        };
      }
    });

    await prisma.flashcardCard.createMany({
      data: cardData,
    });

    return {
      status: 200,
      message: `Successfully saved ${newItems.length} ${type.toLowerCase()} flashcard${newItems.length > 1 ? "s" : ""}`,
      data: {
        deckId: deck.id,
        cardsCreated: newItems.length,
        totalCards: deck.cards.length + newItems.length,
      },
    };
  } catch (error) {
    console.error("Error saving flashcards:", error);
    return {
      status: 500,
      message: "Failed to save flashcards. Please try again.",
    };
  }
}

export async function getUserFlashcardDecks(userId?: string) {
  try {
    const user = userId ? { id: userId } : await currentUser();

    if (!user) {
      return {
        status: 401,
        message: "Unauthorized",
        data: [],
      };
    }

    const decks = await prisma.flashcardDeck.findMany({
      where: { userId: user.id },
      include: {
        cards: {
          where: {
            due: { lte: new Date() },
          },
        },
        _count: {
          select: { cards: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      status: 200,
      data: decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        type: deck.type,
        totalCards: deck._count.cards,
        dueCards: deck.cards.length,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
      })),
    };
  } catch (error) {
    console.error("Error fetching flashcard decks:", error);
    return {
      status: 500,
      message: "Failed to fetch flashcard decks",
      data: [],
    };
  }
}

export async function getDashboardData(deckType?: "VOCABULARY" | "SENTENCE") {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
        decks: [],
        stats: null,
      };
    }

    // Build where clause with optional type filter
    const whereClause: any = { userId: user.id };
    if (deckType) {
      whereClause.type = deckType;
    }

    // Fetch user's flashcard decks with optional type filter
    const decks = await prisma.flashcardDeck.findMany({
      where: whereClause,
      include: {
        cards: {
          select: {
            id: true,
            due: true,
            state: true,
          },
        },
        _count: {
          select: { cards: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Calculate deck statistics
    const now = new Date();
    const formattedDecks = decks.map((deck) => {
      const cards = deck.cards;
      const dueCards = cards.filter((card) => card.due <= now);
      const newCards = cards.filter((card) => card.state === "NEW");

      const learningCards = cards.filter(
        (card) => card.due <= now && card.state !== "NEW",
      );

      // const learningCards = cards.filter(
      //   (card) => card.state === "LEARNING" || card.state === "RELEARNING",
      // );

      const newOrDueCards = new Set([
        ...newCards.map((card) => card.id),
        ...dueCards.map((card) => card.id),
      ]);
      const totalCards = newOrDueCards.size;

      const reviewCards = cards.filter((card) => card.state === "REVIEW");

      return {
        id: deck.id,
        name: deck.name,
        type: deck.type,
        description: deck.description,
        totalCards: totalCards,
        dueCards: dueCards.length,
        newCards: newCards.length,
        learningCards: learningCards.length,
        reviewCards: reviewCards.length,
        createdAt: deck.createdAt.toISOString(),
        updatedAt: deck.updatedAt.toISOString(),
      };
    });

    // Calculate user statistics (filter by type if specified)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityTypeFilter = deckType
      ? [
          deckType === "VOCABULARY"
            ? ActivityType.VOCABULARY_FLASHCARDS
            : ActivityType.SENTENCE_FLASHCARDS,
        ]
      : [ActivityType.VOCABULARY_FLASHCARDS, ActivityType.SENTENCE_FLASHCARDS];

    const [todayActivity, totalXP] = await Promise.all([
      prisma.userActivity.count({
        where: {
          userId: user.id,
          createdAt: { gte: today },
          activityType: {
            in: activityTypeFilter,
          },
        },
      }),
      prisma.xPLogs.aggregate({
        where: {
          userId: user.id,
          activityType: {
            in: activityTypeFilter,
          },
        },
        _sum: { xpEarned: true },
      }),
    ]);

    const stats = {
      totalDecks: decks.length,
      totalCards: formattedDecks.reduce(
        (sum, deck) => sum + deck.totalCards,
        0,
      ),
      cardsStudiedToday: todayActivity,
      xpEarned: totalXP._sum.xpEarned || 0,
      streakDays: 0, // TODO: Calculate streak
    };

    return {
      success: true,
      decks: formattedDecks,
      stats,
      deckType,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      success: false,
      error: "Failed to fetch dashboard data",
      decks: [],
      stats: null,
      deckType,
    };
  }
}

export async function getDeckCards(deckId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const deck = await prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      include: {
        cards: {
          where: {
            due: { lte: new Date() },
          },
          orderBy: { due: "asc" },
        },
      },
    });

    if (!deck) {
      throw new Error("Deck not found");
    }

    return {
      success: true,
      deck: {
        id: deck.id,
        name: deck.name,
        type: deck.type,
        description: deck.description,
      },
      cards: deck.cards,
    };
  } catch (error) {
    console.error("Error fetching deck cards:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      deck: null,
      cards: [],
    };
  }
}

export async function reviewCard(
  cardId: string,
  rating: Rating,
  timeSpent?: number,
) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Validate rating
    if (
      ![Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].includes(rating)
    ) {
      throw new Error("Invalid rating");
    }

    // Get the card
    const card = await prisma.flashcardCard.findFirst({
      where: {
        id: cardId,
        deck: { userId: user.id },
      },
      include: { deck: true },
    });

    if (!card) {
      throw new Error("Card not found");
    }

    // Process the review with FSRS
    const { updatedCard, reviewLog } = fsrsService.processReview(
      card as unknown as FlashcardCard,
      rating as Rating,
      new Date(),
    );

    // Update card and create review record in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.flashcardCard.update({
        where: { id: cardId },
        data: {
          due: updatedCard.due,
          state: updatedCard.state as CardState,
          stability: updatedCard.stability,
          difficulty: updatedCard.difficulty,
          elapsedDays: updatedCard.elapsedDays,
          scheduledDays: updatedCard.scheduledDays,
          learningSteps: updatedCard.learningSteps,
          reps: updatedCard.reps,
          lapses: updatedCard.lapses,
          lastReview: updatedCard.lastReview,
          updatedAt: updatedCard.updatedAt,
        },
      });

      await tx.cardReview.create({
        data: {
          cardId,
          rating,
          timeSpent: timeSpent || 30,
          reviewedAt: new Date(),
        },
      });

      // Record user activity
      // await tx.userActivity.create({
      //   data: {
      //     userId: user.id,
      //     activityType:
      //       card.type === "VOCABULARY"
      //         ? ActivityType.VOCABULARY_FLASHCARDS
      //         : ActivityType.SENTENCE_FLASHCARDS,
      //     targetId: cardId,
      //     timer: timeSpent,
      //     completed: true,
      //     details: {
      //       rating,
      //       previousState: card.state,
      //       newState: updatedCard.state,
      //       intervalDays: updatedCard.scheduledDays,
      //     },
      //   },
      // });

      return { card: updated, reviewLog };
    });

    return {
      success: true,
      card: result.card,
      reviewLog: result.reviewLog,
    };
  } catch (error) {
    console.error("Error processing card review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// export async function completeDeck(deckId: string, cardsCompleted: number) {
//   try {
//     const user = await currentUser();
//     if (!user) {
//       throw new Error("Unauthorized");
//     }

//     const deck = await prisma.flashcardDeck.findFirst({
//       where: {
//         id: deckId,
//         userId: user.id,
//       },
//     });

//     if (!deck) {
//       throw new Error("Deck not found");
//     }

//     // Calculate XP
//     const baseXP = deck.type === "VOCABULARY" ? 15 : 15;
//     const bonusXP = cardsCompleted >= 20 ? 10 : 0;
//     const totalXP = baseXP + bonusXP;

//     // Award XP in transaction
//     await prisma.$transaction(async (tx) => {
//       await tx.xPLogs.create({
//         data: {
//           userId: user.id,
//           xpEarned: totalXP,
//           activityId: deckId,
//           activityType:
//             deck.type === "VOCABULARY"
//               ? ActivityType.VOCABULARY_FLASHCARDS
//               : ActivityType.SENTENCE_FLASHCARDS,
//         },
//       });

//       await tx.user.update({
//         where: { id: user.id },
//         data: { xp: { increment: totalXP } },
//       });

//       await tx.userActivity.create({
//         data: {
//           userId: user.id,
//           activityType:
//             deck.type === "VOCABULARY"
//               ? ActivityType.VOCABULARY_FLASHCARDS
//               : ActivityType.SENTENCE_FLASHCARDS,
//           targetId: deckId,
//           completed: true,
//           details: {
//             action: "deck_completed",
//             cardsCompleted,
//             xpEarned: totalXP,
//           },
//         },
//       });
//     });

//     revalidatePath("/student/flashcards");

//     return {
//       success: true,
//       xpEarned: totalXP,
//       message: `Deck completed! You earned ${totalXP} XP.`,
//     };
//   } catch (error) {
//     console.error("Error completing deck:", error);
//     return {
//       success: false,
//       error: error.message,
//     };
//   }
// }
