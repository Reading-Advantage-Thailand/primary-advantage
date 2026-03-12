"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import {
  fetchPotionRushSentencesApi,
  fetchPotionRushRankingsApi,
  submitPotionRushResultApi,
  type PotionRushSentencesResponse,
  type PotionRushRankingResponse,
  type SubmitPotionRushResultInput,
  type SubmitPotionRushResultResponse,
} from "@/utils/api-request";
import type { VocabularyItem } from "@/store/useGameStore";

// ─── Query Keys ────────────────────────────────────────────
export const potionRushKeys = {
  all: ["potion-rush"] as const,
  sentences: (language: string) =>
    [...potionRushKeys.all, "sentences", language] as const,
  rankings: () => [...potionRushKeys.all, "rankings"] as const,
} as const;

// ─── Types ─────────────────────────────────────────────────
export type WarningStatus = {
  type: "NO_SENTENCES" | "INSUFFICIENT_SENTENCES" | null;
  requiredCount?: number;
  currentCount?: number;
};

export interface UsePotionRushSentencesOptions {
  language?: string;
  enabled?: boolean;
}

// ─── usePotionRushSentences ────────────────────────────────
export function usePotionRushSentences(
  options: UsePotionRushSentencesOptions = {},
) {
  const { language = "th", enabled = true } = options;

  const query = useQuery<PotionRushSentencesResponse>({
    queryKey: potionRushKeys.sentences(language),
    queryFn: () => fetchPotionRushSentencesApi(language),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const sentences: VocabularyItem[] = query.data?.sentences ?? [];

  const warningStatus: WarningStatus = query.data?.warning
    ? {
        type: query.data.warning,
        requiredCount: query.data.requiredCount,
        currentCount: query.data.currentCount,
      }
    : { type: null };

  return {
    sentences,
    warningStatus,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── usePotionRushRankings ─────────────────────────────────
export function usePotionRushRankings(enabled: boolean = true) {
  const query = useQuery<PotionRushRankingResponse>({
    queryKey: potionRushKeys.rankings(),
    queryFn: fetchPotionRushRankingsApi,
    enabled,
    staleTime: 60 * 1000,
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

// ─── useSubmitPotionRushResult ─────────────────────────────
export function useSubmitPotionRushResult() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    SubmitPotionRushResultResponse,
    Error,
    SubmitPotionRushResultInput
  >({
    mutationFn: submitPotionRushResultApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: potionRushKeys.rankings() });
    },
  });

  const mutationRef = useRef(mutation);
  mutationRef.current = mutation;

  const submitResult = useCallback(
    (data: SubmitPotionRushResultInput) =>
      mutationRef.current.mutateAsync(data),
    [],
  );

  return {
    submitResult,
    isSubmitting: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}
