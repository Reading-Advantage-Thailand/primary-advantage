import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { getSAQFeedbackController } from "@/server/controllers/storyQuizController";

export const POST = withAuth(async (req, context, user) => {
  try {
    const result = await getSAQFeedbackController(req, user);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error getting SAQ feedback:", error);
    return NextResponse.json(
      { error: "Failed to get SAQ feedback" },
      { status: 500 },
    );
  }
});
