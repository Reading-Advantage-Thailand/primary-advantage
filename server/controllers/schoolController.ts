import {
  updateSchoolRankingModel,
  getSchoolLeaderboardModel,
} from "../models/schoolModel";

/**
 * Updates the school ranking leaderboard for all schools based on student XP this month.
 */
export const updateSchoolRankingController = async () => {
  try {
    const result = await updateSchoolRankingModel();
    if (!result?.success) {
      throw new Error(result?.error || "Failed to update school ranking");
    }
    return { success: true, message: "School ranking updated successfully" };
  } catch (error) {
    console.error("School Controller: Error updating school ranking:", error);
    throw new Error(
      "School Controller: Error updating school ranking: " + error,
    );
  }
};

/**
 * Fetches the school leaderboard, optionally including a specific user's rank if not in top 5.
 * @param schoolId - The school ID (optional)
 * @param userId - The user ID to include in results if not in top 5 (optional)
 */
export const getSchoolLeaderboardController = async (
  schoolId?: string,
  userId?: string,
) => {
  try {
    const result = await getSchoolLeaderboardModel(schoolId, userId);
    if (!result?.success) {
      throw new Error(result?.error || "Failed to fetch school leaderboard");
    }
    return { success: true, data: result.data };
  } catch (error) {
    console.error(
      "School Controller: Error fetching school leaderboard:",
      error,
    );
    throw new Error(
      "School Controller: Error fetching school leaderboard: " + error,
    );
  }
};
