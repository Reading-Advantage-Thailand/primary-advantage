"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  fetchRPGBattleVocabularyApi,
  submitRPGBattleResultApi,
  fetchRPGBattleRankingApi,
  type RPGBattleVocabularyResponse,
  type SubmitRPGBattleResultInput,
  type SubmitRPGBattleResultResponse,
  type RPGBattleRankingResponse,
} from "@/utils/api-request";
import { SAMPLE_VOCABULARY } from "@/lib/games/sampleVocabulary";
import type { VocabularyItem } from "@/store/useGameStore";

// ─── Query Keys ────────────────────────────────────────────
export const rpgBattleKeys = {
  all: ["rpg-battle"] as const,
  vocabulary: (language: string) =>
    [...rpgBattleKeys.all, "vocabulary", language] as const,
  ranking: (difficulty?: string) =>
    [...rpgBattleKeys.all, "ranking", difficulty ?? "all"] as const,
} as const;

// ─── Types ─────────────────────────────────────────────────
export interface UseRPGBattleVocabularyOptions {
  language?: string;
  enabled?: boolean;
}

export interface UseRPGBattleVocabularyReturn {
  vocabulary: VocabularyItem[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ─── useRPGBattleVocabulary ─────────────────────────────────
export function useRPGBattleVocabulary(
  options: UseRPGBattleVocabularyOptions = {},
): UseRPGBattleVocabularyReturn {
  const { language = "th", enabled = true } = options;

  const query = useQuery<RPGBattleVocabularyResponse>({
    queryKey: rpgBattleKeys.vocabulary(language),
    queryFn: () => fetchRPGBattleVocabularyApi(language),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 mins — vocab doesn't change rapidly
    retry: 1,
  });

  // Derive vocabulary with fallback to sample data on error or empty response
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

// ─── useRPGBattleRanking ───────────────────────────────────
export function useRPGBattleRanking(difficulty?: string) {
  const query = useQuery<RPGBattleRankingResponse>({
    queryKey: rpgBattleKeys.ranking(difficulty),
    queryFn: () => fetchRPGBattleRankingApi(difficulty),
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

// ─── useSubmitRPGBattleResult ──────────────────────────────
export function useSubmitRPGBattleResult() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    SubmitRPGBattleResultResponse,
    Error,
    SubmitRPGBattleResultInput
  >({
    mutationFn: submitRPGBattleResultApi,
    onSuccess: () => {
      // Invalidate user-related queries so XP/stats update everywhere
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const submitResult = useCallback(
    (data: SubmitRPGBattleResultInput) => mutation.mutateAsync(data),
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
