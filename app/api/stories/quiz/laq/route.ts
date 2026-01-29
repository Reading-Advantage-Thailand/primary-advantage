import { withAuth } from "@/server/utils/middleware";
import { NextResponse } from "next/server";
import { submitLAQController } from "@/server/controllers/storyQuizController";

export const POST = withAuth(async (req, context, user) => {
  try {
    const result = await submitLAQController(req, user);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error submitting LAQ:", error);
    return NextResponse.json(
      { error: "Failed to submit LAQ" },
      { status: 500 },
    );
  }
});
