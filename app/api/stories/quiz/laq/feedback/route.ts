import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { getLAQFeedbackController } from "@/server/controllers/storyQuizController";

export const POST = withAuth(async (req, context, user) => {
  try {
    const result = await getLAQFeedbackController(req, user);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error getting LAQ feedback:", error);
    return NextResponse.json(
      { error: "Failed to get LAQ feedback" },
      { status: 500 },
    );
  }
});
