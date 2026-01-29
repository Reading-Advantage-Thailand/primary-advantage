"use client";

import { useQuery } from "@tanstack/react-query";
import { StoryChapterDetail, ChapterDetailResponse } from "@/types/story";
import { fetchChapterApi } from "@/utils/api-request";

export interface UseChapterOptions {
  storyId: string;
  chapterNumber: number;
  enabled?: boolean;
  staleTime?: number;
}

export interface UseChapterReturn {
  chapter: StoryChapterDetail | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useChapter(options: UseChapterOptions): UseChapterReturn {
  const {
    storyId,
    chapterNumber,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  const { data, isLoading, isFetching, isError, error, refetch } =
    useQuery<ChapterDetailResponse>({
      queryKey: ["chapter", storyId, chapterNumber],
      queryFn: () => fetchChapterApi(storyId, chapterNumber),
      enabled: enabled && !!storyId && chapterNumber > 0,
      staleTime,
    });

  return {
    chapter: data?.chapter,
    isLoading,
    isFetching,
    isError,
    error: error as Error | null,
    refetch,
  };
}
