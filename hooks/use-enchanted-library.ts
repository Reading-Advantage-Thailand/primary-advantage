import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { VocabularyItem } from "@/store/useGameStore";
import {
  fetchEnchantedLibraryVocabularyApi,
  fetchEnchantedLibraryRankingApi,
  submitEnchantedLibraryResultApi,
  type EnchantedLibraryVocabularyResponse,
  type EnchantedLibraryRankingResponse,
  type SubmitEnchantedLibraryResultInput,
  type SubmitEnchantedLibraryResultResponse,
} from "@/utils/api-request";
import { SAMPLE_VOCABULARY } from "@/lib/games/sampleVocabulary";

// ─── Query Keys ────────────────────────────────────────────
export const enchantedLibraryKeys = {
  all: ["enchanted-library"] as const,
  vocabulary: (language: string) =>
    [...enchantedLibraryKeys.all, "vocabulary", language] as const,
  rankings: (difficulty?: string) =>
    [...enchantedLibraryKeys.all, "rankings", difficulty ?? "all"] as const,
} as const;

// ─── Types ─────────────────────────────────────────────────
export interface UseEnchantedLibraryVocabularyOptions {
  language?: string;
  enabled?: boolean;
}

export interface UseEnchantedLibraryVocabularyReturn {
  vocabulary: VocabularyItem[];
  warning?: string;
  message?: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ─── useEnchantedLibraryVocabulary ─────────────────────────
export function useEnchantedLibraryVocabulary(
  options: UseEnchantedLibraryVocabularyOptions = {},
): UseEnchantedLibraryVocabularyReturn {
  const { language = "th", enabled = true } = options;

  const query = useQuery<EnchantedLibraryVocabularyResponse>({
    queryKey: enchantedLibraryKeys.vocabulary(language),
    queryFn: () => fetchEnchantedLibraryVocabularyApi(language),
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
    warning: query.data?.warning,
    message: query.data?.message,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useEnchantedLibraryRanking ────────────────────────────
export function useEnchantedLibraryRanking(difficulty?: string) {
  const query = useQuery<EnchantedLibraryRankingResponse>({
    queryKey: enchantedLibraryKeys.rankings(difficulty),
    queryFn: () => fetchEnchantedLibraryRankingApi(difficulty),
    staleTime: 60 * 1000, // 1 min — rankings can update after each game
    retry: 1,
  });

  return {
    rankings: query.data?.rankings ?? {},
    scope: query.data?.scope ?? "global",
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useSubmitEnchantedLibraryResult ───────────────────────
export function useSubmitEnchantedLibraryResult() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    SubmitEnchantedLibraryResultResponse,
    Error,
    SubmitEnchantedLibraryResultInput
  >({
    mutationFn: submitEnchantedLibraryResultApi,
    onSuccess: () => {
      // Invalidate user-related queries so XP/stats update everywhere
      queryClient.invalidateQueries({ queryKey: ["user"] });
      // Invalidate rankings so they reflect the new score
      queryClient.invalidateQueries({
        queryKey: enchantedLibraryKeys.rankings(),
      });
    },
  });

  const submitResult = useCallback(
    (data: SubmitEnchantedLibraryResultInput) => mutation.mutateAsync(data),
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
