import { NextRequest } from "next/server";
import {
  getUserActivity,
  updateUserActivity,
  getUserArticleRecords,
  getUserReminderReread,
} from "../models/userModel";
import { ActivityType, UserXpEarned } from "@/types/enum";
import { error } from "console";
import { currentUser } from "@/lib/session";

/**
 * Handles updating user activity based on activity type, calculating XP earned.
 * @param body - Object containing data (responses, progress, timer) and activityType
 * @param targetId - Optional target ID for the activity
 */
export const handleUpdateUserActivity = async (
  body: {
    data: {
      responses?: string[];
      progress?: number[];
      timer: number;
    };
    activityType: ActivityType;
  },
  targetId?: string,
) => {
  const { data, activityType } = body;

  if (activityType === ActivityType.MC_QUESTION) {
    const correctCount = data.progress?.filter((p) => p === 0).length;

    if (!correctCount) {
      throw new Error("Progress not Have");
    }

    const xpEarned = correctCount * UserXpEarned.MCQuestion;

    return updateUserActivity(activityType, data, targetId, xpEarned);
  }
};

/**
 * Fetches user activity data by user ID.
 * @param id - The user ID
 */
export const fetchUserActivity = async (id: string) => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("User not found");
    }

    const result = await getUserActivity(id);
    return result;
  } catch (error) {
    console.log(error);
  }
};

/**
 * Fetches user article reading records with pagination.
 * @param params - Object containing userId, page, limit, search
 */
export const fetchUserArticleRecords = async (params: {
  userId: string;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  try {
    const { userId, page = 1, limit = 10, search } = params;

    // Validate user ID
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Validate pagination parameters
    if (page < 1) {
      throw new Error("Page must be greater than 0");
    }

    if (limit < 1 || limit > 100) {
      throw new Error("Limit must be between 1 and 100");
    }

    const result = await getUserArticleRecords(userId, page, limit, search);

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    console.error("Error in fetchUserArticleRecords controller:", error);
    throw error;
  }
};

/**
 * Fetches user reminder reread records.
 * @param userId - The user ID
 */
export const fetchUserReminderReread = async (userId: string) => {
  try {
    // Validate user ID
    if (!userId) {
      throw new Error("User ID is required");
    }

    const result = await getUserReminderReread(userId);

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Error in fetchUserReminderReread controller:", error);
    throw error;
  }
};
