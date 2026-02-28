//---------------------------------
// System Dashboard API
//---------------------------------

export const fetchSystemDashboardApi = async (dateRange?: string | number) => {
  const queryParams = new URLSearchParams({
    dateRange: dateRange?.toString() || "",
  }).toString();
  const response = await fetch(`/api/system/dashboard?${queryParams}`).then(
    (res) => res.json(),
  );
  return response;
};

export const fetchLicensesApi = async () => {
  const response = await fetch("/api/licenses").then((res) => res.json());
  return response;
};

export const fetchDailyActivityUsersApi = async (licenseId?: string) => {
  const queryParams = new URLSearchParams({
    licenseId: licenseId || "",
  }).toString();
  const response = await fetch(
    `/api/system/dashboard/activity/dairy-activity-users?${queryParams}`,
  ).then((res) => res.json());
  return response;
};

export const fetchActiveUsersApi = async (dateRange?: string | number) => {
  const queryParams = new URLSearchParams({
    dateRange: dateRange?.toString() || "",
  }).toString();
  const response = await fetch(
    `/api/system/dashboard/activity/active-users?${queryParams}`,
  ).then((res) => res.json());
  return response;
};

export const fetchMetricsCardsApi = async (dateRange?: string | number) => {
  const queryParams = new URLSearchParams({
    dateRange: dateRange?.toString() || "",
  }).toString();
  const response = await fetch(
    `/api/system/dashboard/summary?${queryParams}`,
  ).then((res) => res.json());
  return response;
};

export const fetchSystemActivityChartsApi = async (
  dateRange?: string | number,
) => {
  const queryParams = new URLSearchParams({
    dateRange: dateRange?.toString() || "",
  }).toString();
  const response = await fetch(
    `/api/system/dashboard/activity/charts?${queryParams}`,
  ).then((res) => res.json());
  return response;
};

export const fetchSchoolsListApi = async () => {
  const response = await fetch(`/api/system/dashboard/schools`).then((res) =>
    res.json(),
  );
  return response;
};

//---------------------------------
// Admin Dashboard API
//---------------------------------

export const fetchAdminDashboardApi = async (
  schoolId?: string,
  dateRange?: string,
) => {
  const queryParams = new URLSearchParams({
    schoolId: schoolId || "",
    dateRange: dateRange || "",
  }).toString();
  const response = await fetch(`/api/admin/dashboard?${queryParams}`).then(
    (res) => res.json(),
  );
  return response;
};

//---------------------------------
// Teacher Dashboard API
//---------------------------------

export const fetchTeacherDashboardApi = async () => {
  const response = await fetch("/api/teachers/dashboard").then((res) =>
    res.json(),
  );
  return response;
};

export const fetchTeacherClassReportApi = async (classroomId: string) => {
  const response = await fetch(
    `/api/teachers/dashboard/report/${classroomId}`,
  ).then((res) => res.json());
  return response;
};

export const fetchTeacherClassHeatmapApi = async (
  classroomId: string,
  expanded: boolean,
) => {
  const response = await fetch(
    `/api/teachers/dashboard/report/${classroomId}/heatmap?expanded=${expanded}`,
  ).then((res) => res.json());
  return response;
};

export const fetchTeacherClassGoalsApi = async (classroomId: string) => {
  const response = await fetch(
    `/api/teachers/dashboard/report/${classroomId}/goals`,
  ).then((res) => res.json());
  return response;
};

//---------------------------------
// Student Dashboard API
//---------------------------------

export const fetchStudentDashboardApi = async () => {
  const response = await fetch("/api/students/report").then((res) =>
    res.json(),
  );
  return response;
};
export const fetchStudentHeatmapApi = async (studentId: string) => {
  const response = await fetch(`/api/students/${studentId}/heatmap`).then(
    (res) => res.json(),
  );
  return response;
};

export const fetchStudentVelocityApi = async (studentId?: string) => {
  const queryParams = studentId
    ? new URLSearchParams({ studentId }).toString()
    : "";
  const url = queryParams
    ? `/api/students/velocity?${queryParams}`
    : "/api/students/velocity";
  const response = await fetch(url).then((res) => res.json());
  return response;
};

export const fetchStudentGenreEngagementApi = async (studentId?: string) => {
  const queryParams = studentId
    ? new URLSearchParams({ studentId }).toString()
    : "";
  const url = queryParams
    ? `/api/students/${studentId}/genre-engagement?${queryParams}`
    : `/api/students/${studentId}/genre-engagement`;
  const response = await fetch(url).then((res) => res.json());
  return response;
};

export const fetchStudentSRSHealthApi = async (studentId: string) => {
  const response = await fetch(`/api/students/${studentId}/srs-health`).then(
    (res) => res.json(),
  );
  return response;
};

export const fetchStudentGoalsApi = async () => {
  const response = await fetch(`/api/students/goals`).then((res) => res.json());
  return response;
};

//---------------------------------
// All Roles API
//---------------------------------

export const fetchAISummaryApi = async (
  kind?: string,
  contextId?: string,
  refresh?: string,
) => {
  const queryParams = new URLSearchParams({
    kind: kind || "",
    contextId: contextId || "",
    refresh: refresh || "",
  }).toString();
  const response = await fetch(`/api/ai/summary?${queryParams}`).then((res) =>
    res.json(),
  );
  return response;
};

export const fetchDashboardHeatmapApi = async (
  entityIds?: string,
  timeframe?: string,
) => {
  const queryParams = new URLSearchParams({
    entityIds: entityIds || "",
    timeframe: timeframe || "",
  }).toString();
  const response = await fetch(`/api/dashboard/heatmap?${queryParams}`).then(
    (res) => res.json(),
  );
  return response;
};

//---------------------------------
// Stories API
//---------------------------------

import {
  StoriesQueryParams,
  StoryListResponse,
  StoryDetailResponse,
  ChapterDetailResponse,
} from "@/types/story";

export const fetchStoriesApi = async (
  params: StoriesQueryParams = {},
): Promise<StoryListResponse> => {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set("page", params.page.toString());
  if (params.limit) queryParams.set("limit", params.limit.toString());
  if (params.search) queryParams.set("search", params.search);
  if (params.genre) queryParams.set("genre", params.genre);
  if (params.cefrLevel) queryParams.set("cefrLevel", params.cefrLevel);
  if (params.raLevel !== undefined)
    queryParams.set("raLevel", params.raLevel.toString());
  if (params.type) queryParams.set("type", params.type);
  if (params.isPublished !== undefined)
    queryParams.set("isPublished", params.isPublished.toString());
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);

  const queryString = queryParams.toString();
  const url = queryString ? `/api/stories?${queryString}` : "/api/stories";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch stories");
  }

  return response.json();
};

export const fetchStoriesGenresApi = async (): Promise<{
  genres: string[];
}> => {
  const response = await fetch("/api/stories?getGenres=true");

  if (!response.ok) {
    throw new Error("Failed to fetch genres");
  }

  return response.json();
};

export const fetchStoryByIdApi = async (
  storyId: string,
): Promise<StoryDetailResponse> => {
  const response = await fetch(`/api/stories/${storyId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Story not found");
    }
    throw new Error("Failed to fetch story");
  }

  return response.json();
};

export const fetchChapterApi = async (
  storyId: string,
  chapterNumber: number,
): Promise<ChapterDetailResponse> => {
  const response = await fetch(
    `/api/stories/${storyId}/chapters/${chapterNumber}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Chapter not found");
    }
    throw new Error("Failed to fetch chapter");
  }

  return response.json();
};

//---------------------------------
// Rune Match Game API
//---------------------------------

export interface RuneMatchVocabularyResponse {
  vocabulary: { term: string; translation: string }[];
}

export interface SubmitRuneMatchResultInput {
  score: number;
  correctAnswers: number;
  totalAttempts: number;
  accuracy: number;
  difficulty: string;
}

export interface SubmitRuneMatchResultResponse {
  success: boolean;
  xpEarned?: number;
}

export const fetchRuneMatchVocabularyApi = async (
  language: string = "th",
): Promise<RuneMatchVocabularyResponse> => {
  const queryParams = new URLSearchParams({ language }).toString();
  const response = await fetch(
    `/api/games/rune-match/vocabulary?${queryParams}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch rune match vocabulary");
  }

  return response.json();
};

export const submitRuneMatchResultApi = async (
  data: SubmitRuneMatchResultInput,
): Promise<SubmitRuneMatchResultResponse> => {
  const response = await fetch("/api/games/rune-match/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to submit rune match results");
  }

  return response.json();
};

export interface RuneMatchRankingEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  xp: number;
  difficulty: string;
}

export interface RuneMatchRankingResponse {
  success: boolean;
  rankings: RuneMatchRankingEntry[];
  scope: "school" | "global";
}

export const fetchRuneMatchRankingsApi = async (
  difficulty?: string,
): Promise<RuneMatchRankingResponse> => {
  const queryParams = difficulty
    ? `?${new URLSearchParams({ difficulty }).toString()}`
    : "";
  const response = await fetch(`/api/games/rune-match/ranking${queryParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch rune match rankings");
  }

  return response.json();
};

//---------------------------------
// RPG Battle Game API
//---------------------------------

export interface RPGBattleVocabularyResponse {
  vocabulary: { term: string; translation: string }[];
}

export interface SubmitRPGBattleResultInput {
  xp: number;
  accuracy: number;
  totalAttempts: number;
  totalCorrect: number;
  turnsTaken: number;
  heroId: string | null;
  enemyId: string | null;
  outcome: "victory" | "defeat";
}

export interface SubmitRPGBattleResultResponse {
  success: boolean;
  xpEarned?: number;
}

export interface RPGBattleRankingEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  xp: number;
  difficulty: string;
}

export interface RPGBattleRankingResponse {
  success: boolean;
  rankings: RPGBattleRankingEntry[];
  scope: "school" | "global";
}

export const fetchRPGBattleVocabularyApi = async (
  language: string = "th",
): Promise<RPGBattleVocabularyResponse> => {
  const queryParams = new URLSearchParams({ language }).toString();
  const response = await fetch(
    `/api/games/rpg-battle/vocabulary?${queryParams}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch RPG Battle vocabulary");
  }

  return response.json();
};

export const submitRPGBattleResultApi = async (
  data: SubmitRPGBattleResultInput,
): Promise<SubmitRPGBattleResultResponse> => {
  const response = await fetch("/api/games/rpg-battle/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to submit RPG Battle results");
  }

  return response.json();
};

export const fetchRPGBattleRankingApi = async (
  difficulty?: string,
): Promise<RPGBattleRankingResponse> => {
  const queryParams = difficulty
    ? `?${new URLSearchParams({ difficulty }).toString()}`
    : "";
  const response = await fetch(`/api/games/rpg-battle/ranking${queryParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch RPG Battle rankings");
  }

  return response.json();
};
