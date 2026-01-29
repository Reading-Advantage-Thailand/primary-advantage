import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import {
  submitMCQuizController,
  retakeMCQuizController,
} from "@/server/controllers/storyQuizController";

export const POST = withAuth(async (req, context, user) => {
  try {
    const result = await submitMCQuizController(req, user);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error submitting MC quiz:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(async (req, context, user) => {
  try {
    const result = await retakeMCQuizController(req, user);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error retaking MC quiz:", error);
    return NextResponse.json(
      { error: "Failed to retake quiz" },
      { status: 500 },
    );
  }
});
