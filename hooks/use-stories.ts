"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  StoryFilters,
  StoryListResponse,
  StoriesQueryParams,
} from "@/types/story";
import { fetchStoriesApi, fetchStoriesGenresApi } from "@/utils/api-request";

export interface UseStoriesOptions {
  initialPage?: number;
  initialLimit?: number;
  initialFilters?: StoryFilters;
  enabled?: boolean;
  staleTime?: number;
}

export interface UseStoriesReturn {
  // Data
  stories: StoryListResponse["stories"];
  pagination: StoryListResponse["pagination"] | undefined;
  genres: string[];

  // Loading states
  isLoading: boolean;
  isLoadingGenres: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;

  // Pagination controls
  page: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;

  // Filter controls
  filters: StoryFilters;
  setFilters: (filters: StoryFilters) => void;
  updateFilter: <K extends keyof StoryFilters>(
    key: K,
    value: StoryFilters[K],
  ) => void;
  clearFilters: () => void;

  // Search
  search: string;
  setSearch: (search: string) => void;

  // Refetch
  refetch: () => void;
}

export function useStories(options: UseStoriesOptions = {}): UseStoriesReturn {
  const {
    initialPage = 1,
    initialLimit = 10,
    initialFilters = {},
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  const queryClient = useQueryClient();

  // Local state for pagination and filters
  const [page, setPage] = useState(initialPage);
  const [filters, setFiltersState] = useState<StoryFilters>(initialFilters);
  const [search, setSearchState] = useState(initialFilters.search || "");

  // Build query params
  const queryParams: StoriesQueryParams = {
    page,
    limit: initialLimit,
    ...filters,
    search: search || undefined,
  };

  // Fetch stories query
  const {
    data: storiesData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<StoryListResponse>({
    queryKey: ["stories", queryParams],
    queryFn: () => fetchStoriesApi(queryParams),
    enabled,
    staleTime,
    placeholderData: (previousData) => previousData,
  });

  // Fetch genres query
  const { data: genresData, isLoading: isLoadingGenres } = useQuery<{
    genres: string[];
  }>({
    queryKey: ["stories-genres"],
    queryFn: fetchStoriesGenresApi,
    staleTime: 30 * 60 * 1000, // 30 minutes - genres don't change often
  });

  // Pagination controls
  const nextPage = useCallback(() => {
    if (storiesData?.pagination.hasNextPage) {
      setPage((prev) => prev + 1);
    }
  }, [storiesData?.pagination.hasNextPage]);

  const previousPage = useCallback(() => {
    if (storiesData?.pagination.hasPreviousPage) {
      setPage((prev) => prev - 1);
    }
  }, [storiesData?.pagination.hasPreviousPage]);

  // Filter controls
  const setFilters = useCallback((newFilters: StoryFilters) => {
    setFiltersState(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const updateFilter = useCallback(
    <K extends keyof StoryFilters>(key: K, value: StoryFilters[K]) => {
      setFiltersState((prev) => ({ ...prev, [key]: value }));
      setPage(1); // Reset to first page when filters change
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setSearchState("");
    setPage(1);
  }, []);

  // Search with debounce reset
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1); // Reset to first page when search changes
  }, []);

  return {
    // Data
    stories: storiesData?.stories || [],
    pagination: storiesData?.pagination,
    genres: genresData?.genres || [],

    // Loading states
    isLoading,
    isLoadingGenres,
    isFetching,
    isError,
    error: error as Error | null,

    // Pagination controls
    page,
    setPage: (newPage: number) => setPage(newPage),
    nextPage,
    previousPage,

    // Filter controls
    filters,
    setFilters,
    updateFilter,
    clearFilters,

    // Search
    search,
    setSearch,

    // Refetch
    refetch,
  };
}
