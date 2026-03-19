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

//---------------------------------
// Dragon Rider Game API
//---------------------------------
export interface DragonRiderVocabularyResponse {
  vocabulary: { term: string; translation: string }[];
}

export interface DragonRiderRankingEntry {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
}

export interface DragonRiderRankingResponse {
  success: boolean;
  rankings: Record<string, DragonRiderRankingEntry[]>;
  scope: "school" | "global";
}

export interface SubmitDragonRiderResultInput {
  xp: number;
  accuracy: number;
  totalAttempts: number;
  correctAnswers: number;
  dragonCount: number;
  difficulty: string;
  outcome: "victory" | "defeat";
}

export interface SubmitDragonRiderResultResponse {
  success: boolean;
  xpEarned?: number;
}

export const submitDragonRiderResultApi = async (
  data: SubmitDragonRiderResultInput,
): Promise<SubmitDragonRiderResultResponse> => {
  const response = await fetch("/api/games/dragon-rider/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to submit Dragon Rider results");
  }

  return response.json();
};

export const fetchDragonRiderVocabularyApi = async (
  language: string = "th",
): Promise<DragonRiderVocabularyResponse> => {
  const queryParams = new URLSearchParams({ language }).toString();
  const response = await fetch(
    `/api/games/dragon-rider/vocabulary?${queryParams}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Dragon Rider vocabulary");
  }

  return response.json();
};

export const fetchDragonRiderRankingApi = async (
  difficulty?: string,
): Promise<DragonRiderRankingResponse> => {
  const queryParams = difficulty
    ? `?${new URLSearchParams({ difficulty }).toString()}`
    : "";
  const response = await fetch(`/api/games/dragon-rider/ranking${queryParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch Dragon Rider rankings");
  }

  return response.json();
};

//---------------------------------
// Potion Rush Game API
//---------------------------------

export interface PotionRushSentencesResponse {
  success: boolean;
  sentences: { term: string; translation: string }[];
  warning?: "NO_SENTENCES" | "INSUFFICIENT_SENTENCES";
  requiredCount?: number;
  currentCount?: number;
  total?: number;
}

export interface PotionRushRankingEntry {
  rank: number;
  userId: string;
  name: string | null;
  image: string | null;
  xp: number;
}

export interface PotionRushRankingResponse {
  success: boolean;
  rankings: Record<string, PotionRushRankingEntry[]>;
  scope: "school" | "global";
}

export interface SubmitPotionRushResultInput {
  xp: number;
  score: number;
  accuracy: number;
  difficulty: string;
  correctAnswers: number;
  totalAttempts: number;
  gameTime: number;
}

export interface SubmitPotionRushResultResponse {
  success: boolean;
  xpEarned?: number;
}

export const fetchPotionRushSentencesApi = async (
  language: string = "th",
): Promise<PotionRushSentencesResponse> => {
  const queryParams = new URLSearchParams({ language }).toString();
  const response = await fetch(
    `/api/games/potion-rush/sentences?${queryParams}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch potion rush sentences");
  }

  return response.json();
};

export const submitPotionRushResultApi = async (
  data: SubmitPotionRushResultInput,
): Promise<SubmitPotionRushResultResponse> => {
  const response = await fetch("/api/games/potion-rush/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to submit potion rush results");
  }

  return response.json();
};

export const fetchPotionRushRankingsApi =
  async (): Promise<PotionRushRankingResponse> => {
    const response = await fetch("/api/games/potion-rush/ranking");

    if (!response.ok) {
      throw new Error("Failed to fetch potion rush rankings");
    }

    return response.json();
  };

//---------------------------------
// Enchanted Library Game API
//---------------------------------

export interface EnchantedLibraryVocabularyResponse {
  success: boolean;
  vocabulary: { term: string; translation: string }[];
  warning?: "NO_VOCABULARY" | "INSUFFICIENT_VOCABULARY";
  message?: string;
}

export interface EnchantedLibraryRankingEntry {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
}

export interface EnchantedLibraryRankingResponse {
  success: boolean;
  rankings: Record<string, EnchantedLibraryRankingEntry[]>;
  scope: "school" | "global";
}

export interface SubmitEnchantedLibraryResultInput {
  xp: number;
  accuracy: number;
  correctAnswers: number;
  totalAttempts: number;
  difficulty: string;
  gameTime: number;
}

export interface SubmitEnchantedLibraryResultResponse {
  success: boolean;
  xpEarned?: number;
}

export const fetchEnchantedLibraryVocabularyApi = async (
  language: string = "th",
): Promise<EnchantedLibraryVocabularyResponse> => {
  const queryParams = new URLSearchParams({ language }).toString();
  const response = await fetch(
    `/api/games/enchanted-library/vocabulary?${queryParams}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Enchanted Library vocabulary");
  }

  return response.json();
};

export const fetchEnchantedLibraryRankingApi = async (
  difficulty?: string,
): Promise<EnchantedLibraryRankingResponse> => {
  const queryParams = difficulty
    ? `?${new URLSearchParams({ difficulty }).toString()}`
    : "";
  const response = await fetch(
    `/api/games/enchanted-library/ranking${queryParams}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Enchanted Library rankings");
  }

  return response.json();
};

export const submitEnchantedLibraryResultApi = async (
  data: SubmitEnchantedLibraryResultInput,
): Promise<SubmitEnchantedLibraryResultResponse> => {
  const response = await fetch("/api/games/enchanted-library/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to submit Enchanted Library results");
  }

  return response.json();
};
