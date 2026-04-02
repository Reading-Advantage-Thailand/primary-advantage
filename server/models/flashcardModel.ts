import { prisma } from "@/lib/prisma";
import { FlashcardType } from "@/types/enum";
import { CardState } from "@prisma/client";
import { createEmptyCard, Card } from "ts-fsrs";

// ============================================================================
// Types
// ============================================================================

export interface StoryChapterWordInput {
  vocabulary: string;
  definition?: Record<string, string> | null;
  startTime: number;
  endTime: number;
  audioUrl?: string;
}

export interface StoryChapterSentenceInput {
  sentence: string;
  translation?: Record<string, string> | null;
  startTime: number;
  endTime: number;
  audioUrl?: string;
}

export interface FlashcardExistenceResult {
  wordsExist: boolean;
  sentencesExist: boolean;
}

export interface SaveFlashcardResult {
  wordsCreated: number;
  sentencesCreated: number;
  alreadyExists: boolean;
}

// ============================================================================
// Model Functions - Database Operations
// ============================================================================

/**
 * Check if flashcards already exist for a story chapter
 */
export async function checkStoryChapterFlashcardExistsModel(
  userId: string,
  storyChapterId: string,
): Promise<FlashcardExistenceResult> {
  const [existingVocabulary, existingSentence] = await Promise.all([
    prisma.flashcardCard.findFirst({
      where: {
        storyChapterId,
        type: "VOCABULARY",
        deck: { userId },
      },
      select: { id: true },
    }),
    prisma.flashcardCard.findFirst({
      where: {
        storyChapterId,
        type: "SENTENCE",
        deck: { userId },
      },
      select: { id: true },
    }),
  ]);

  return {
    wordsExist: !!existingVocabulary,
    sentencesExist: !!existingSentence,
  };
}

/**
 * Find or create a flashcard deck by type
 */
export async function findOrCreateDeckModel(
  userId: string,
  type: FlashcardType,
) {
  let deck = await prisma.flashcardDeck.findFirst({
    where: { userId, type },
  });

  if (!deck) {
    deck = await prisma.flashcardDeck.create({
      data: { userId, type },
    });
  }

  return deck;
}

/**
 * Create vocabulary flashcard cards for a story chapter
 */
export async function createVocabularyCardsModel(
  deckId: string,
  storyChapterId: string,
  words: StoryChapterWordInput[],
): Promise<number> {
  const emptyCard: Card = createEmptyCard();

  const cardData = words.map((word) => ({
    deckId,
    type: "VOCABULARY" as FlashcardType,
    storyChapterId,
    audioUrl: word.audioUrl,
    startTime: word.startTime,
    endTime: word.endTime,
    word: word.vocabulary,
    definition: word.definition ?? undefined,
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
  }));

  await prisma.flashcardCard.createMany({ data: cardData });

  return words.length;
}

/**
 * Create sentence flashcard cards for a story chapter
 */
export async function createSentenceCardsModel(
  deckId: string,
  storyChapterId: string,
  sentences: StoryChapterSentenceInput[],
): Promise<number> {
  const emptyCard: Card = createEmptyCard();

  const cardData = sentences.map((sentence) => ({
    deckId,
    type: "SENTENCE" as FlashcardType,
    storyChapterId,
    audioUrl: sentence.audioUrl,
    startTime: sentence.startTime,
    endTime: sentence.endTime,
    sentence: sentence.sentence,
    translation: sentence.translation ?? undefined,
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
  }));

  await prisma.flashcardCard.createMany({ data: cardData });

  return sentences.length;
}

// ============================================================================
// Article Flashcard Model Functions
// ============================================================================

export interface ArticleWordInput {
  vocabulary: string;
  definition?: Record<string, string> | null;
  startTime: number;
  endTime: number;
  audioUrl?: string;
}

export interface ArticleSentenceInput {
  sentence: string;
  translation?: Record<string, string> | null;
  startTime: number;
  endTime: number;
  audioUrl?: string;
}

/**
 * Check if flashcards already exist for an article
 */
export async function checkArticleFlashcardExistsModel(
  userId: string,
  articleId: string,
): Promise<FlashcardExistenceResult> {
  const [existingVocabulary, existingSentence] = await Promise.all([
    prisma.flashcardCard.findFirst({
      where: {
        articleId,
        type: "VOCABULARY",
        deck: { userId },
      },
      select: { id: true },
    }),
    prisma.flashcardCard.findFirst({
      where: {
        articleId,
        type: "SENTENCE",
        deck: { userId },
      },
      select: { id: true },
    }),
  ]);

  return {
    wordsExist: !!existingVocabulary,
    sentencesExist: !!existingSentence,
  };
}

/**
 * Get all existing vocabulary words for a user across ALL articles/chapters.
 * Used for cross-article deduplication.
 */
export async function getExistingVocabularyWordsModel(
  userId: string,
): Promise<string[]> {
  const cards = await prisma.flashcardCard.findMany({
    where: {
      type: "VOCABULARY",
      deck: { userId },
      word: { not: null },
    },
    select: { word: true },
  });

  return cards.map((c) => c.word!.toLowerCase());
}

/**
 * Create vocabulary flashcard cards for an article
 */
export async function createArticleVocabularyCardsModel(
  deckId: string,
  articleId: string,
  words: ArticleWordInput[],
): Promise<number> {
  const emptyCard: Card = createEmptyCard();

  const cardData = words.map((word) => ({
    deckId,
    type: "VOCABULARY" as FlashcardType,
    articleId,
    audioUrl: word.audioUrl,
    startTime: word.startTime,
    endTime: word.endTime,
    word: word.vocabulary,
    definition: word.definition ?? undefined,
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
  }));

  await prisma.flashcardCard.createMany({ data: cardData });

  return words.length;
}

/**
 * Create sentence flashcard cards for an article
 */
export async function createArticleSentenceCardsModel(
  deckId: string,
  articleId: string,
  sentences: ArticleSentenceInput[],
): Promise<number> {
  const emptyCard: Card = createEmptyCard();

  const cardData = sentences.map((sentence) => ({
    deckId,
    type: "SENTENCE" as FlashcardType,
    articleId,
    audioUrl: sentence.audioUrl,
    startTime: sentence.startTime,
    endTime: sentence.endTime,
    sentence: sentence.sentence,
    translation: sentence.translation ?? undefined,
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
  }));

  await prisma.flashcardCard.createMany({ data: cardData });

  return sentences.length;
}

/**
 * Mark article activity log as saved for a specific user
 */
export async function markArticleFlashcardSavedModel(
  userId: string,
  articleId: string,
): Promise<void> {
  await prisma.articleActivityLog.updateMany({
    where: {
      articleId,
      userId,
    },
    data: { isSentenceAndWordsSaved: true },
  });
}
