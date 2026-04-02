import {
  checkStoryChapterFlashcardExistsModel,
  checkArticleFlashcardExistsModel,
  getExistingVocabularyWordsModel,
  findOrCreateDeckModel,
  createVocabularyCardsModel,
  createSentenceCardsModel,
  createArticleVocabularyCardsModel,
  createArticleSentenceCardsModel,
  markArticleFlashcardSavedModel,
  StoryChapterWordInput,
  StoryChapterSentenceInput,
  ArticleWordInput,
  ArticleSentenceInput,
  FlashcardExistenceResult,
  SaveFlashcardResult,
} from "../models/flashcardModel";
import { FlashcardType } from "@/types/enum";

// ============================================================================
// Types
// ============================================================================

export interface SaveStoryChapterFlashcardInput {
  storyChapterId: string;
  words?: StoryChapterWordInput[];
  sentences?: StoryChapterSentenceInput[];
}

export interface SaveStoryChapterFlashcardResponse {
  success: boolean;
  message: string;
  data?: SaveFlashcardResult;
}

export interface CheckFlashcardExistenceResponse {
  success: boolean;
  data?: FlashcardExistenceResult;
  message?: string;
}

// ============================================================================
// Controller Functions - Business Logic
// ============================================================================

/**
 * Check if flashcards already exist for a story chapter
 */
export async function checkStoryChapterFlashcardExistsController(
  userId: string,
  storyChapterId: string,
): Promise<CheckFlashcardExistenceResponse> {
  try {
    const result = await checkStoryChapterFlashcardExistsModel(
      userId,
      storyChapterId,
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error checking flashcard existence:", error);
    return {
      success: false,
      message: "Failed to check flashcard existence",
    };
  }
}

/**
 * Save story chapter wordlist and sentences to flashcard deck
 * - Only saves if flashcards don't already exist for this chapter
 * - Creates separate VOCABULARY and SENTENCE deck types
 */
export async function saveStoryChapterFlashcardController(
  userId: string,
  input: SaveStoryChapterFlashcardInput,
): Promise<SaveStoryChapterFlashcardResponse> {
  try {
    const { storyChapterId, words, sentences } = input;

    // Validate input
    if (!storyChapterId) {
      return {
        success: false,
        message: "storyChapterId is required",
      };
    }

    if (!words?.length && !sentences?.length) {
      return {
        success: false,
        message: "No words or sentences provided",
      };
    }

    // Check if flashcards already exist
    const { wordsExist, sentencesExist } =
      await checkStoryChapterFlashcardExistsModel(userId, storyChapterId);

    // If both already exist, return early
    if (wordsExist && sentencesExist) {
      return {
        success: true,
        message: "Flashcards already saved for this chapter",
        data: {
          wordsCreated: 0,
          sentencesCreated: 0,
          alreadyExists: true,
        },
      };
    }

    let wordsCreated = 0;
    let sentencesCreated = 0;

    // Save vocabulary if not already exists and words provided
    if (words?.length && !wordsExist) {
      const existingWords = await getExistingVocabularyWordsModel(userId);

      // Filter out words that already exist in any article/chapter (case-insensitive)
      const uniqueWords = words.filter(
        (w) => !existingWords.includes(w.vocabulary.toLowerCase()),
      );

      if (uniqueWords.length > 0) {
        // Randomly select 3-5 words from the unique set
        const count = Math.min(
          Math.floor(Math.random() * 3) + 3,
          uniqueWords.length,
        );
        const selectedWords = shuffleArray(uniqueWords).slice(0, count);

        const vocabDeck = await findOrCreateDeckModel(
          userId,
          FlashcardType.VOCABULARY,
        );
        wordsCreated = await createVocabularyCardsModel(
          vocabDeck.id,
          storyChapterId,
          selectedWords,
        );
      }
    }

    // Save sentences if not already exists and sentences provided
    if (sentences?.length && !sentencesExist) {
      const sentenceDeck = await findOrCreateDeckModel(
        userId,
        FlashcardType.SENTENCE,
      );
      sentencesCreated = await createSentenceCardsModel(
        sentenceDeck.id,
        storyChapterId,
        sentences,
      );
    }

    return {
      success: true,
      message: `Successfully saved ${wordsCreated} words and ${sentencesCreated} sentences to flashcards`,
      data: {
        wordsCreated,
        sentencesCreated,
        alreadyExists: false,
      },
    };
  } catch (error) {
    console.error("Error saving story chapter flashcards:", error);
    return {
      success: false,
      message: "Failed to save flashcards. Please try again.",
    };
  }
}

// ============================================================================
// Article Flashcard Controller Functions
// ============================================================================

export interface SaveArticleFlashcardInput {
  articleId: string;
  words?: ArticleWordInput[];
  sentences?: ArticleSentenceInput[];
}

export interface SaveArticleFlashcardResponse {
  success: boolean;
  message: string;
  data?: SaveFlashcardResult;
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if flashcards already exist for an article
 */
export async function checkArticleFlashcardExistsController(
  userId: string,
  articleId: string,
): Promise<CheckFlashcardExistenceResponse> {
  try {
    const result = await checkArticleFlashcardExistsModel(userId, articleId);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error checking article flashcard existence:", error);
    return {
      success: false,
      message: "Failed to check flashcard existence",
    };
  }
}

/**
 * Save article wordlist and sentences to flashcard deck.
 * - Randomly selects 3-5 words from the provided list
 * - Deduplicates words across ALL articles (case-insensitive)
 * - Saves ALL sentences (no random selection)
 * - Marks the article activity log as saved for the user
 */
export async function saveArticleFlashcardController(
  userId: string,
  input: SaveArticleFlashcardInput,
): Promise<SaveArticleFlashcardResponse> {
  try {
    const { articleId, words, sentences } = input;

    if (!articleId) {
      return {
        success: false,
        message: "articleId is required",
      };
    }

    if (!words?.length && !sentences?.length) {
      return {
        success: false,
        message: "No words or sentences provided",
      };
    }

    // Check if flashcards already exist for this article
    const { wordsExist, sentencesExist } =
      await checkArticleFlashcardExistsModel(userId, articleId);

    if (wordsExist && sentencesExist) {
      return {
        success: true,
        message: "Flashcards already saved for this article",
        data: {
          wordsCreated: 0,
          sentencesCreated: 0,
          alreadyExists: true,
        },
      };
    }

    let wordsCreated = 0;
    let sentencesCreated = 0;

    // Save vocabulary with random selection + cross-article dedup
    if (words?.length && !wordsExist) {
      // Get all existing vocabulary words across ALL articles for this user
      const existingWords = await getExistingVocabularyWordsModel(userId);

      // Filter out words that already exist in any article (case-insensitive)
      const uniqueWords = words.filter(
        (w) => !existingWords.includes(w.vocabulary.toLowerCase()),
      );

      if (uniqueWords.length > 0) {
        // Randomly select 3-5 words from the unique set
        const count = Math.min(
          Math.floor(Math.random() * 3) + 3, // 3, 4, or 5
          uniqueWords.length,
        );
        const selectedWords = shuffleArray(uniqueWords).slice(0, count);

        const vocabDeck = await findOrCreateDeckModel(
          userId,
          FlashcardType.VOCABULARY,
        );
        wordsCreated = await createArticleVocabularyCardsModel(
          vocabDeck.id,
          articleId,
          selectedWords,
        );
      }
    }

    // Save ALL sentences (no random selection)
    if (sentences?.length && !sentencesExist) {
      const sentenceDeck = await findOrCreateDeckModel(
        userId,
        FlashcardType.SENTENCE,
      );
      sentencesCreated = await createArticleSentenceCardsModel(
        sentenceDeck.id,
        articleId,
        sentences,
      );
    }

    // Mark article activity log as saved for this user
    await markArticleFlashcardSavedModel(userId, articleId);

    return {
      success: true,
      message: `Successfully saved ${wordsCreated} words and ${sentencesCreated} sentences to flashcards`,
      data: {
        wordsCreated,
        sentencesCreated,
        alreadyExists: false,
      },
    };
  } catch (error) {
    console.error("Error saving article flashcards:", error);
    return {
      success: false,
      message: "Failed to save flashcards. Please try again.",
    };
  }
}
