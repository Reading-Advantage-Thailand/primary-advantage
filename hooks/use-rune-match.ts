"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  fetchRuneMatchVocabularyApi,
  fetchRuneMatchRankingsApi,
  submitRuneMatchResultApi,
  type RuneMatchVocabularyResponse,
  type RuneMatchRankingResponse,
  type SubmitRuneMatchResultInput,
  type SubmitRuneMatchResultResponse,
} from "@/utils/api-request";
import { SAMPLE_VOCABULARY } from "@/lib/games/sampleVocabulary";
import type { VocabularyItem } from "@/store/useGameStore";

// ─── Query Keys ────────────────────────────────────────────
export const runeMatchKeys = {
  all: ["rune-match"] as const,
  vocabulary: (language: string) =>
    [...runeMatchKeys.all, "vocabulary", language] as const,
  rankings: (difficulty?: string) =>
    [...runeMatchKeys.all, "rankings", difficulty ?? "all"] as const,
} as const;

// ─── Types ─────────────────────────────────────────────────
export interface UseRuneMatchVocabularyOptions {
  language?: string;
  enabled?: boolean;
}

export interface UseRuneMatchVocabularyReturn {
  vocabulary: VocabularyItem[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ─── useRuneMatchVocabulary ─────────────────────────────────
export function useRuneMatchVocabulary(
  options: UseRuneMatchVocabularyOptions = {},
): UseRuneMatchVocabularyReturn {
  const { language = "th", enabled = true } = options;

  const query = useQuery<RuneMatchVocabularyResponse>({
    queryKey: runeMatchKeys.vocabulary(language),
    queryFn: () => fetchRuneMatchVocabularyApi(language),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 mins — vocab doesn't change rapidly
    retry: 1,
  });

  // Derive vocabulary with fallback to sample data
  const vocabulary: VocabularyItem[] =
    query.data?.vocabulary && query.data.vocabulary.length > 0
      ? query.data.vocabulary
      : query.isError ||
          (query.isSuccess && query.data?.vocabulary?.length === 0)
        ? SAMPLE_VOCABULARY
        : [];

  return {
    vocabulary,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useRuneMatchRankings ──────────────────────────────────
export function useRuneMatchRankings(difficulty?: string) {
  const query = useQuery<RuneMatchRankingResponse>({
    queryKey: runeMatchKeys.rankings(difficulty),
    queryFn: () => fetchRuneMatchRankingsApi(difficulty),
    staleTime: 60 * 1000, // 1 min — rankings can update after each game
    retry: 1,
  });

  return {
    rankings: query.data?.rankings ?? [],
    scope: query.data?.scope ?? "global",
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useSubmitRuneMatchResult ──────────────────────────────
export function useSubmitRuneMatchResult() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    SubmitRuneMatchResultResponse,
    Error,
    SubmitRuneMatchResultInput
  >({
    mutationFn: submitRuneMatchResultApi,
    onSuccess: () => {
      // Invalidate user-related queries so XP/stats update
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const submitResult = useCallback(
    (data: SubmitRuneMatchResultInput) => mutation.mutateAsync(data),
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
