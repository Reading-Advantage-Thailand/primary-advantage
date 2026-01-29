"use client";

import { useQuery } from "@tanstack/react-query";
import { StoryDetail, StoryDetailResponse } from "@/types/story";
import { fetchStoryByIdApi } from "@/utils/api-request";

export interface UseStoryOptions {
  storyId: string;
  enabled?: boolean;
  staleTime?: number;
}

export interface UseStoryReturn {
  story: StoryDetail | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStory(options: UseStoryOptions): UseStoryReturn {
  const {
    storyId,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  const { data, isLoading, isFetching, isError, error, refetch } =
    useQuery<StoryDetailResponse>({
      queryKey: ["story", storyId],
      queryFn: () => fetchStoryByIdApi(storyId),
      enabled: enabled && !!storyId,
      staleTime,
    });

  return {
    story: data?.story,
    isLoading,
    isFetching,
    isError,
    error: error as Error | null,
    refetch,
  };
}
