import { NextRequest } from "next/server";
import { updateUserActivity } from "../models/user";
import { ActivityType, UserXpEarned } from "@/types/enum";
import { error } from "console";

export const handleUpdateUserActivity = async (
  body: {
    data: {
      responses?: string[];
      progress?: number[];
      timer: number;
    };
    activityType: ActivityType;
  },
  targetId?: string
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
