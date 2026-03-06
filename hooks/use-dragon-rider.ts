import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { VocabularyItem } from "@/store/useGameStore";
import {
  fetchDragonRiderVocabularyApi,
  fetchDragonRiderRankingApi,
  submitDragonRiderResultApi,
  type DragonRiderVocabularyResponse,
  type DragonRiderRankingResponse,
  type SubmitDragonRiderResultInput,
  type SubmitDragonRiderResultResponse,
} from "@/utils/api-request";
import { SAMPLE_VOCABULARY } from "@/lib/games/sampleVocabulary";

// ─── Query Keys ────────────────────────────────────────────
export const dragonRiderKeys = {
  all: ["dragon-rider"] as const,
  vocabulary: (language: string) =>
    [...dragonRiderKeys.all, "vocabulary", language] as const,
  rankings: (difficulty?: string) =>
    [...dragonRiderKeys.all, "rankings", difficulty ?? "all"] as const,
} as const;

// ─── Types ─────────────────────────────────────────────────
export interface UseDragonRiderVocabularyOptions {
  language?: string;
  enabled?: boolean;
}

export interface UseDragonRiderVocabularyReturn {
  vocabulary: VocabularyItem[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ─── useDragonRiderVocabulary ─────────────────────────────────
export function useDragonRiderVocabulary(
  options: UseDragonRiderVocabularyOptions = {},
): UseDragonRiderVocabularyReturn {
  const { language = "th", enabled = true } = options;

  const query = useQuery<DragonRiderVocabularyResponse>({
    queryKey: dragonRiderKeys.vocabulary(language),
    queryFn: () => fetchDragonRiderVocabularyApi(language),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 mins — vocab doesn't change rapidly
    retry: 1,
  });

  // Derive vocabulary with fallback to sample data on error or empty response
  const vocabulary: VocabularyItem[] = useMemo(
    () =>
      query.data?.vocabulary && query.data.vocabulary.length > 0
        ? query.data.vocabulary
        : query.isError ||
            (query.isSuccess && query.data?.vocabulary?.length === 0)
          ? SAMPLE_VOCABULARY
          : [],
    [query.data?.vocabulary, query.isError, query.isSuccess],
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

// ─── useDragonRiderRanking ───────────────────────────────────
export function useDragonRiderRanking(difficulty?: string) {
  const query = useQuery<DragonRiderRankingResponse>({
    queryKey: dragonRiderKeys.rankings(difficulty),
    queryFn: () => fetchDragonRiderRankingApi(difficulty),
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

// ─── useSubmitDragonRiderResult ──────────────────────────────
export function useSubmitDragonRiderResult() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    SubmitDragonRiderResultResponse,
    Error,
    SubmitDragonRiderResultInput
  >({
    mutationFn: submitDragonRiderResultApi,
    onSuccess: () => {
      // Invalidate user-related queries so XP/stats update everywhere
      queryClient.invalidateQueries({ queryKey: ["user"] });
      // Invalidate rankings so they reflect the new score (but NOT vocabulary)
      queryClient.invalidateQueries({ queryKey: dragonRiderKeys.rankings() });
    },
  });

  const submitResult = useCallback(
    (data: SubmitDragonRiderResultInput) => mutation.mutateAsync(data),
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
