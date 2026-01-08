import { useQuery } from "@tanstack/react-query";
import {
  fetchStudentGenreEngagementApi,
  fetchStudentVelocityApi,
  fetchStudentSRSHealthApi,
} from "@/utils/api-request";
import {
  GenreMetricsResponse,
  VelocityMetrics,
  SRSHealthData,
} from "@/server/models/studentModel";

interface UseVelocityMetricsOptions {
  studentId?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseGenreEngagementMetricsOptions {
  studentId?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useVelocityMetrics(options: UseVelocityMetricsOptions = {}) {
  const { studentId, enabled = true, refetchInterval } = options;

  return useQuery<VelocityMetrics>({
    queryKey: ["velocity-metrics", studentId],
    queryFn: () => fetchStudentVelocityApi(studentId),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
  });
}

export function useGenreEngagementMetrics(
  options: UseGenreEngagementMetricsOptions = {},
) {
  const { studentId, enabled = true, refetchInterval } = options;

  return useQuery<GenreMetricsResponse>({
    queryKey: ["genre-engagement-metrics", studentId],
    queryFn: () => fetchStudentGenreEngagementApi(studentId),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
  });
}

interface UseSRSHealthOptions {
  studentId?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useSRSHealth(options: UseSRSHealthOptions) {
  const { studentId, enabled = true, refetchInterval } = options;

  return useQuery<SRSHealthData>({
    queryKey: ["srs-health", studentId],
    queryFn: () => {
      if (!studentId) {
        throw new Error("Student ID is required");
      }
      return fetchStudentSRSHealthApi(studentId);
    },
    enabled: enabled && !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
  });
}
