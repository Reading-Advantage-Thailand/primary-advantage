"use client";

import React, { useEffect, useState } from "react";
import { GenreEngagementWidget } from "./student-genre-engagement";
import type { GenreMetricsResponse } from "@/server/models/studentModel";

interface GenreEngagementContainerProps {
  studentId: string;
}

/**
 * Example component showing how to use the Genre Engagement API
 * This component fetches data and passes it to the GenreEngagementWidget
 */
export function GenreEngagementContainer({
  studentId,
}: GenreEngagementContainerProps) {
  const [data, setData] = useState<GenreMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenreData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/students/${studentId}/genre-engagement`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const genreData: GenreMetricsResponse = await response.json();
      setData(genreData);
    } catch (err) {
      console.error("Error fetching genre engagement data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenreData();
  }, [studentId]);

  const handleGenreClick = (genre: string) => {
    // TODO: Navigate to articles filtered by genre
    // router.push(`/student/read?genre=${encodeURIComponent(genre)}`);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchGenreData}
          className="mt-2 text-sm text-red-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <GenreEngagementWidget
      data={data}
      loading={loading}
      onRefresh={fetchGenreData}
      onGenreClick={handleGenreClick}
    />
  );
}
