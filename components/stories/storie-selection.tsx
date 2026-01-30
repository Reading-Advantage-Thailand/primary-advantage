"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import StarRating from "@/components/ui/rating";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useStories } from "@/hooks/use-stories";
import { useDebounce } from "@/hooks/use-mobile";
import { getStorieImageUrl } from "@/lib/storage-config";
import { useLocale, useTranslations } from "next-intl";

export default function StorieSelection() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 300);

  const {
    stories,
    pagination,
    genres,
    isLoading,
    isFetching,
    page,
    setPage,
    nextPage,
    previousPage,
    filters,
    updateFilter,
    clearFilters,
    setSearch,
  } = useStories({
    initialLimit: 10,
  });

  // Update search when debounced value changes
  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  // Count active filters
  const activeFiltersCount =
    Object.values(filters).filter((v) => v !== undefined && v !== "").length +
    (searchInput ? 1 : 0);

  const handleClearFilters = () => {
    setSearchInput("");
    clearFilters();
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Story Selection</CardTitle>
        <CardDescription>
          Select a story to read and improve your reading skills. You can filter
          the stories by genre and level.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters Section */}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search stories"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select
            value={filters.genre || ""}
            onValueChange={(value) =>
              updateFilter("genre", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="default"
            className="px-3"
            onClick={handleClearFilters}
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="mt-4 grid grid-flow-row gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[20rem] w-full" />
            ))}
          </div>
        ) : stories.length > 0 ? (
          <>
            {/* Stories Grid */}
            <div className="relative mt-4">
              {isFetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                </div>
              )}
              <div className="grid grid-flow-row gap-4 sm:grid-cols-2">
                {stories.map((story, index) => (
                  <div
                    key={story.id}
                    onClick={() => router.push(`/student/stories/${story.id}`)}
                    className="flex h-[20rem] w-full cursor-pointer flex-col justify-between gap-2 rounded-md bg-black bg-cover bg-center p-4 transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundImage: `url(${getStorieImageUrl(story.id)})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      {story.raLevel && (
                        <Badge variant="destructive">
                          {tCommon("ralevel", {
                            level: story.raLevel,
                          })}
                        </Badge>
                      )}
                      {story.cefrLevel && (
                        <Badge variant="destructive">
                          {tCommon("cefrlevel", {
                            level: story.cefrLevel,
                          })}
                        </Badge>
                      )}
                      {story.genre && (
                        <Badge variant="destructive">{story.genre}</Badge>
                      )}
                      {story.rating && (
                        <Badge variant="destructive">
                          <StarRating initialRating={story.rating} readOnly />
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 rounded-md bg-black/40 p-2">
                      <h3 className="text-xl font-bold text-white drop-shadow-lg">
                        {story.title}
                      </h3>
                      <p className="line-clamp-4 text-sm text-white drop-shadow-lg">
                        {(story.translatedSummary &&
                          story.translatedSummary[locale]) ||
                          story.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousPage}
                  disabled={!pagination.hasPreviousPage || isFetching}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          disabled={isFetching}
                          className="h-8 w-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    },
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!pagination.hasNextPage || isFetching}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Pagination Info */}
            {pagination && (
              <div className="text-muted-foreground mt-2 text-center text-sm">
                Showing {(page - 1) * pagination.limit + 1} -{" "}
                {Math.min(page * pagination.limit, pagination.totalStories)} of{" "}
                {pagination.totalStories} stories
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 flex h-64 items-center justify-center text-center text-2xl text-gray-500">
            No stories found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
