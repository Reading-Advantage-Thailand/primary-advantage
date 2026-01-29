"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChapterActivityStatus,
  WordFlashcard,
  SentenceFlashcard,
} from "@/types/story";

// Types for API request/response
export interface SaveStoryChapterFlashcardInput {
  storyChapterId: string;
  words?: {
    vocabulary: string;
    definition?: Record<string, string> | null;
    startTime: number;
    endTime: number;
    audioUrl?: string;
  }[];
  sentences?: {
    sentence: string;
    translation?: Record<string, string> | null;
    startTime: number;
    endTime: number;
    audioUrl?: string;
  }[];
}

export interface SaveStoryChapterFlashcardResult {
  message: string;
  data?: {
    wordsCreated: number;
    sentencesCreated: number;
    alreadyExists: boolean;
  };
}

export interface FlashcardExistenceResult {
  wordsExist: boolean;
  sentencesExist: boolean;
}

// Types for the hook
export interface FlashcardSaveStatus {
  wordsSaved: boolean;
  sentencesSaved: boolean;
  isSaving: boolean;
  isChecking: boolean;
  error: string | null;
}

export interface UseAutoSaveFlashcardOptions {
  // Story chapter specific
  storyChapterId?: string;
  // Article specific (for future use)
  articleId?: string;
  // Activity status to check quiz completion
  activityStatus?: ChapterActivityStatus;
  // Flashcard data
  words?: WordFlashcard[] | null;
  sentences?: SentenceFlashcard[] | null;
  // Audio URLs
  wordsAudioUrl?: string;
  sentencesAudioUrl?: string;
  // Enable/disable auto-save
  enabled?: boolean;
}

export interface UseAutoSaveFlashcardReturn {
  status: FlashcardSaveStatus;
  // Manual save trigger (if needed)
  triggerSave: () => void;
  // Check if quiz requirements are met
  isQuizCompleted: boolean;
}

/**
 * Prepare words data with timing for flashcard saving
 */
function prepareWordsForSave(
  words: WordFlashcard[] | null | undefined,
  audioUrl?: string,
) {
  if (!words?.length) return [];

  return words.map((word, index) => {
    const startTime = word.timeSeconds ?? 0;
    const endTime =
      index === words.length - 1
        ? startTime + 10
        : (words[index + 1]?.timeSeconds ?? startTime + 5);

    return {
      vocabulary: word.vocabulary,
      definition: word.definition,
      startTime,
      endTime,
      audioUrl,
    };
  });
}

/**
 * Prepare sentences data with timing for flashcard saving
 */
function prepareSentencesForSave(
  sentences: SentenceFlashcard[] | null | undefined,
  audioUrl?: string,
) {
  if (!sentences?.length) return [];

  return sentences.map((sentence, index) => {
    const startTime = sentence.timeSeconds ?? 0;
    const endTime =
      index === sentences.length - 1
        ? startTime + 10
        : (sentences[index + 1]?.timeSeconds ?? startTime + 5);

    return {
      sentence: sentence.sentence,
      translation: sentence.translation,
      startTime,
      endTime,
      audioUrl,
    };
  });
}

/**
 * Hook to auto-save flashcards when quiz conditions are met
 * Works with both story chapters and articles (extendable)
 *
 * Conditions for auto-save:
 * - ALL quizzes (MCQ, SAQ, and LAQ) must be completed
 * - Flashcards for this chapter/article don't already exist
 */
export function useAutoSaveFlashcard(
  options: UseAutoSaveFlashcardOptions,
): UseAutoSaveFlashcardReturn {
  const {
    storyChapterId,
    articleId,
    activityStatus,
    words,
    sentences,
    wordsAudioUrl,
    sentencesAudioUrl,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();
  const hasSavedRef = useRef(false);

  // Determine the content ID for query keys
  const contentId = storyChapterId || articleId;
  const contentType = storyChapterId ? "storyChapter" : "article";

  // Check if ALL quizzes are completed (MCQ, SAQ, and LAQ)
  const isQuizCompleted =
    !!activityStatus?.isMultipleChoiceCompleted &&
    !!activityStatus?.isShortAnswerCompleted &&
    !!activityStatus?.isLongAnswerCompleted;

  // Query to check if flashcards already exist (using API route)
  const { data: existenceData, isLoading: isChecking } =
    useQuery<FlashcardExistenceResult>({
      queryKey: ["flashcard-existence", contentType, contentId],
      queryFn: async () => {
        if (storyChapterId) {
          const response = await fetch(
            `/api/flashcard/story-chapter?storyChapterId=${storyChapterId}`,
          );
          if (!response.ok) {
            throw new Error("Failed to check flashcard existence");
          }
          return response.json();
        }
        // For articles, return default (can be extended later)
        return { wordsExist: false, sentencesExist: false };
      },
      enabled: enabled && !!contentId,
      staleTime: 30 * 1000, // 30 seconds
    });

  // Mutation for saving flashcards (using API route)
  const saveMutation = useMutation<
    SaveStoryChapterFlashcardResult,
    Error,
    SaveStoryChapterFlashcardInput
  >({
    mutationFn: async (input) => {
      const response = await fetch("/api/flashcard/story-chapter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save flashcards");
      }

      return response.json();
    },
    onSuccess: (result) => {
      if (result.data) {
        hasSavedRef.current = true;
        // Invalidate the existence query to reflect new state
        queryClient.invalidateQueries({
          queryKey: ["flashcard-existence", contentType, contentId],
        });
      }
    },
    onError: (error) => {
      console.error("Failed to save flashcards:", error);
    },
  });

  // Manual save trigger
  const triggerSave = useCallback(() => {
    if (!storyChapterId || saveMutation.isPending) return;

    const preparedWords = prepareWordsForSave(words, wordsAudioUrl);
    const preparedSentences = prepareSentencesForSave(
      sentences,
      sentencesAudioUrl,
    );

    if (!preparedWords.length && !preparedSentences.length) return;

    saveMutation.mutate({
      storyChapterId,
      words: preparedWords,
      sentences: preparedSentences,
    });
  }, [
    storyChapterId,
    words,
    sentences,
    wordsAudioUrl,
    sentencesAudioUrl,
    saveMutation,
  ]);

  // Auto-save effect
  useEffect(() => {
    // Skip if not enabled or no content ID
    if (!enabled || !contentId) return;

    // Skip if still checking existence
    if (isChecking) return;

    // Skip if no quiz completed
    if (!isQuizCompleted) return;

    // Skip if already saved in this session
    if (hasSavedRef.current) return;

    // Skip if both already exist
    if (existenceData?.wordsExist && existenceData?.sentencesExist) {
      hasSavedRef.current = true;
      return;
    }

    // Skip if no data to save
    if (!words?.length && !sentences?.length) return;

    // Skip if mutation is already pending
    if (saveMutation.isPending) return;

    // Prepare data and trigger save
    const preparedWords = !existenceData?.wordsExist
      ? prepareWordsForSave(words, wordsAudioUrl)
      : [];
    const preparedSentences = !existenceData?.sentencesExist
      ? prepareSentencesForSave(sentences, sentencesAudioUrl)
      : [];

    if (!preparedWords.length && !preparedSentences.length) return;

    // Trigger the save
    if (storyChapterId) {
      saveMutation.mutate({
        storyChapterId,
        words: preparedWords,
        sentences: preparedSentences,
      });
    }
  }, [
    enabled,
    contentId,
    isQuizCompleted,
    isChecking,
    existenceData,
    words,
    sentences,
    wordsAudioUrl,
    sentencesAudioUrl,
    storyChapterId,
    saveMutation,
  ]);

  // Reset saved ref when content changes
  useEffect(() => {
    hasSavedRef.current = false;
  }, [contentId]);

  // Determine saved status
  const wordsSaved =
    existenceData?.wordsExist ||
    (saveMutation.isSuccess &&
      (saveMutation.data?.data?.wordsCreated ?? 0) > 0) ||
    false;

  const sentencesSaved =
    existenceData?.sentencesExist ||
    (saveMutation.isSuccess &&
      (saveMutation.data?.data?.sentencesCreated ?? 0) > 0) ||
    false;

  return {
    status: {
      wordsSaved,
      sentencesSaved,
      isSaving: saveMutation.isPending,
      isChecking,
      error: saveMutation.error?.message || null,
    },
    triggerSave,
    isQuizCompleted,
  };
}
