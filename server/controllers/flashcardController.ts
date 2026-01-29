import {
  checkStoryChapterFlashcardExistsModel,
  findOrCreateDeckModel,
  createVocabularyCardsModel,
  createSentenceCardsModel,
  StoryChapterWordInput,
  StoryChapterSentenceInput,
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
      const vocabDeck = await findOrCreateDeckModel(
        userId,
        FlashcardType.VOCABULARY,
      );
      wordsCreated = await createVocabularyCardsModel(
        vocabDeck.id,
        storyChapterId,
        words,
      );
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
