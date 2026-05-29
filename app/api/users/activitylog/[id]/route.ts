import { handleUpdateUserActivity } from "@/server/controllers/userController";
import { ActivityType } from "@/types/enum";
import { NextRequest, NextResponse } from "next/server";

/**
 * Logs user activity for a specific user. Currently logs a placeholder MC_QUESTION activity type.
 * @param request - The incoming request with activity data (articleId, data, timer, type)
 * @param params - Route parameters containing the user ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { articleId, data, timer, type } = await request.json();

  await handleUpdateUserActivity({
    activityType: ActivityType.MC_QUESTION,
    data: {
      responses: [],
      progress: [],
      timer: 0,
    },
  });

  return NextResponse.json({ message: "Activity logged successfully" });
}
