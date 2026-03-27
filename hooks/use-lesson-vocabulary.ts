import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLessonVocabularyApi,
  submitLessonGamesResultApi,
  fetchLessonGameResultApi,
  type LessonVocabularyResponse,
  type LessonGameResultResponse,
} from "@/utils/api-request";

// ─── Query Keys ────────────────────────────────────────────
export const lessonVocabularyKeys = {
  all: ["lesson-vocabulary"] as const,
  vocabulary: (articleId: string, language: string) =>
    [...lessonVocabularyKeys.all, articleId, language] as const,
} as const;

// ─── Types ─────────────────────────────────────────────────
export interface UseLessonVocabularyOptions {
  articleId: string;
  language?: string;
  enabled?: boolean;
}

export interface UseLessonVocabularyReturn {
  vocabulary: { term: string; translation: string }[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface SubmitLessonGamesResultInput {
  articleId: string;
  xp?: number;
  score?: number;
  correctAnswers?: number;
  totalAttempts?: number;
  accuracy?: number;
  difficulty?: string;
  gameId?: string;
}

export interface SubmitLessonGamesResultResponse {
  success: boolean;
  xpEarned?: number;
}

// ─── useLessonVocabulary ──────────────────────────────────
export function useLessonVocabulary(
  options: UseLessonVocabularyOptions,
): UseLessonVocabularyReturn {
  const { articleId, language = "th", enabled = true } = options;

  const query = useQuery<LessonVocabularyResponse>({
    queryKey: lessonVocabularyKeys.vocabulary(articleId, language),
    queryFn: () => fetchLessonVocabularyApi(articleId, language),
    enabled: enabled && !!articleId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const vocabulary = useMemo(
    () => query.data?.vocabulary ?? [],
    [query.data?.vocabulary],
  );

  return {
    vocabulary,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useSubmitLessonGamesResult ──────────────────────────────
export function useSubmitLessonGamesResult() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    SubmitLessonGamesResultResponse,
    Error,
    SubmitLessonGamesResultInput
  >({
    mutationFn: submitLessonGamesResultApi,
    onSuccess: () => {
      // Invalidate user-related queries so XP/stats update
      queryClient.invalidateQueries({ queryKey: ["user"] });
      // Invalidate game result queries so latest result is fetched
      queryClient.invalidateQueries({
        queryKey: lessonVocabularyKeys.all,
      });
    },
  });

  const submitResult = useCallback(
    (data: SubmitLessonGamesResultInput) => mutation.mutateAsync(data),
    [mutation],
  );

  return {
    submitResult,
    isSubmitting: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}

// ─── useLessonGameResult ──────────────────────────────────
export function useLessonGameResult(articleId: string) {
  const query = useQuery<LessonGameResultResponse>({
    queryKey: [...lessonVocabularyKeys.all, "result", articleId],
    queryFn: () => fetchLessonGameResultApi(articleId),
    enabled: !!articleId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    result: query.data?.result ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
